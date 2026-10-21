import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "../generated/prisma/client.js";
import { conflict, notFound } from "../lib/http-error.js";
import { idParamSchema, paginated, paginationSchema, toSkipTake } from "../lib/pagination.js";
import { prisma } from "../lib/prisma.js";
import { type AuthUser, authenticate, currentUser, isStaff, requireRole } from "../middlewares/auth.js";
import { createNotification } from "../services/notification.service.js";

// Chat CSKH dạng hỏi-đáp qua REST (client poll định kỳ). Có thể nâng cấp lên WebSocket sau.
export const conversationRouter = Router();

conversationRouter.use(authenticate);

const messageSchema = z.object({ content: z.string().trim().min(1).max(2000) });

const conversationInclude = {
  customer: { select: { id: true, name: true, avatarUrl: true } },
  staff: { select: { id: true, name: true, avatarUrl: true } },
  messages: { orderBy: { createdAt: "desc" }, take: 1 },
} as const satisfies Prisma.ConversationInclude;

async function getAccessibleConversation(user: AuthUser, id: number) {
  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation || (!isStaff(user) && conversation.customerId !== user.id)) throw notFound("Cuộc trò chuyện");
  return conversation;
}

conversationRouter.post("/", async (request, response) => {
  const user = currentUser(request);
  const input = messageSchema
    .extend({ subject: z.string().trim().min(2).max(191), bookingId: z.number().int().positive().optional() })
    .parse(request.body);

  if (input.bookingId) {
    const booking = await prisma.booking.findFirst({ where: { id: input.bookingId, userId: user.id }, select: { id: true } });
    if (!booking) throw notFound("Booking");
  }

  const conversation = await prisma.conversation.create({
    data: {
      customerId: user.id,
      subject: input.subject,
      bookingId: input.bookingId,
      messages: { create: { senderId: user.id, content: input.content } },
    },
    include: conversationInclude,
  });
  response.status(201).json({ data: conversation });
});

conversationRouter.get("/", async (request, response) => {
  const user = currentUser(request);
  const query = paginationSchema.extend({ status: z.enum(["OPEN", "CLOSED"]).optional() }).parse(request.query);
  const where: Prisma.ConversationWhereInput = {
    ...(isStaff(user) ? {} : { customerId: user.id }),
    ...(query.status ? { status: query.status } : {}),
  };
  const { skip, take } = toSkipTake(query);
  const [data, total] = await prisma.$transaction([
    prisma.conversation.findMany({ where, orderBy: { lastMessageAt: "desc" }, skip, take, include: conversationInclude }),
    prisma.conversation.count({ where }),
  ]);
  response.json(paginated(data, total, query));
});

// Lấy tin nhắn; ?after=<messageId> để chỉ lấy tin mới khi poll.
conversationRouter.get("/:id/messages", async (request, response) => {
  const user = currentUser(request);
  const { id } = idParamSchema.parse(request.params);
  const { after } = z.object({ after: z.coerce.number().int().positive().optional() }).parse(request.query);
  await getAccessibleConversation(user, id);

  const messages = await prisma.message.findMany({
    where: { conversationId: id, ...(after ? { id: { gt: after } } : {}) },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: { sender: { select: { id: true, name: true, role: true, avatarUrl: true } } },
  });
  // Đánh dấu đã đọc các tin do phía bên kia gửi.
  await prisma.message.updateMany({
    where: { conversationId: id, senderId: { not: user.id }, readAt: null },
    data: { readAt: new Date() },
  });
  response.json({ data: messages });
});

conversationRouter.post("/:id/messages", async (request, response) => {
  const user = currentUser(request);
  const { id } = idParamSchema.parse(request.params);
  const { content } = messageSchema.parse(request.body);
  const conversation = await getAccessibleConversation(user, id);
  if (conversation.status === "CLOSED") throw conflict("Cuộc trò chuyện đã đóng", "CONVERSATION_CLOSED");

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.message.create({ data: { conversationId: id, senderId: user.id, content } });
    await tx.conversation.update({
      where: { id },
      data: {
        lastMessageAt: created.createdAt,
        // Nhân viên trả lời đầu tiên sẽ được gán phụ trách cuộc trò chuyện.
        ...(isStaff(user) && !conversation.staffId ? { staffId: user.id } : {}),
      },
    });
    if (isStaff(user)) {
      await createNotification(
        {
          userId: conversation.customerId,
          type: "SUPPORT",
          title: "CSKH đã trả lời",
          body: content.length > 120 ? `${content.slice(0, 117)}...` : content,
          data: { conversationId: id },
        },
        tx,
      );
    }
    return created;
  });
  response.status(201).json({ data: message });
});

conversationRouter.patch("/:id", requireRole("STAFF", "ADMIN"), async (request, response) => {
  const { id } = idParamSchema.parse(request.params);
  const input = z
    .object({ status: z.enum(["OPEN", "CLOSED"]), staffId: z.number().int().positive().nullable() })
    .partial()
    .parse(request.body);
  response.json({ data: await prisma.conversation.update({ where: { id }, data: input, include: conversationInclude }) });
});
