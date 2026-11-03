import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "../generated/prisma/client.js";
import { env } from "../config/env.js";
import type { Conversation } from "../generated/prisma/client.js";
import { conflict, HttpError, notFound } from "../lib/http-error.js";
import { idParamSchema, paginated, paginationSchema, toSkipTake } from "../lib/pagination.js";
import { prisma } from "../lib/prisma.js";
import { type AuthUser, authenticate, currentUser, isStaff, requireRole } from "../middlewares/auth.js";
import { handoffToStaff, isAiPending, scheduleAiReply } from "../services/ai-support.service.js";
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

// aiPending: AI đang soạn câu trả lời (cờ trong bộ nhớ tiến trình), giao diện hiện "Trợ lý AI đang trả lời...".
const withAiPending = <T extends { id: number }>(conversation: T) => ({ ...conversation, aiPending: isAiPending(conversation.id) });

const aiDisabled = () => new HttpError(503, "Trợ lý AI đang tắt", "AI_DISABLED");

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

  // AI bật: hội thoại mới do Trợ lý AI trả lời trước, khách gặp nhân viên được bất cứ lúc nào.
  const conversation = await prisma.conversation.create({
    data: {
      customerId: user.id,
      subject: input.subject,
      bookingId: input.bookingId,
      handler: env.AI_ENABLED ? "AI" : "STAFF",
      messages: { create: { senderId: user.id, content: input.content } },
    },
    include: conversationInclude,
  });
  if (conversation.handler === "AI") void scheduleAiReply(conversation.id);
  response.status(201).json({ data: withAiPending(conversation) });
});

conversationRouter.get("/", async (request, response) => {
  const user = currentUser(request);
  const query = paginationSchema
    .extend({ status: z.enum(["OPEN", "CLOSED"]).optional(), handler: z.enum(["AI", "STAFF"]).optional() })
    .parse(request.query);
  const where: Prisma.ConversationWhereInput = {
    ...(isStaff(user) ? {} : { customerId: user.id }),
    ...(query.status ? { status: query.status } : {}),
    ...(query.handler ? { handler: query.handler } : {}),
  };
  const { skip, take } = toSkipTake(query);
  const [data, total] = await prisma.$transaction([
    prisma.conversation.findMany({ where, orderBy: { lastMessageAt: "desc" }, skip, take, include: conversationInclude }),
    prisma.conversation.count({ where }),
  ]);
  response.json(paginated(data.map(withAiPending), total, query));
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
  // Đánh dấu đã đọc các tin do phía bên kia gửi, gồm cả tin AI (senderId NULL không khớp điều kiện "not").
  await prisma.message.updateMany({
    where: { conversationId: id, readAt: null, OR: [{ senderId: { not: user.id } }, { senderId: null }] },
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
        // Nhân viên nhắn vào hội thoại AI đang xử lý = tiếp quản; AI ngừng trả lời.
        ...(isStaff(user) && conversation.handler === "AI"
          ? { handler: "STAFF" as const, handoffReason: "STAFF_TAKEOVER", handoffAt: created.createdAt }
          : {}),
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
  if (!isStaff(user) && conversation.handler === "AI") void scheduleAiReply(id);
  response.status(201).json({ data: message });
});

// Khách (chủ hội thoại) bấm "Gặp nhân viên".
conversationRouter.post("/:id/handoff", async (request, response) => {
  const user = currentUser(request);
  const { id } = idParamSchema.parse(request.params);
  const { reason } = z.object({ reason: z.string().trim().min(1).max(255).optional() }).parse(request.body ?? {});
  const conversation = await getAccessibleConversation(user, id);
  if (conversation.customerId !== user.id) throw notFound("Cuộc trò chuyện");
  if (conversation.status === "CLOSED") throw conflict("Cuộc trò chuyện đã đóng", "CONVERSATION_CLOSED");
  if (conversation.handler === "STAFF") throw conflict("Cuộc trò chuyện đã do nhân viên CSKH phụ trách", "ALREADY_WITH_STAFF");

  await handoffToStaff(id, { reason: reason ?? "CUSTOMER_REQUEST", postMessage: false });
  const updated = await prisma.conversation.findUniqueOrThrow({ where: { id }, include: conversationInclude });
  response.json({ data: withAiPending(updated) });
});

conversationRouter.patch("/:id", requireRole("STAFF", "ADMIN"), async (request, response) => {
  const { id } = idParamSchema.parse(request.params);
  const input = z
    .object({
      status: z.enum(["OPEN", "CLOSED"]),
      staffId: z.number().int().positive().nullable(),
      // Staff trả hội thoại lại cho AI ("AI") hoặc nhận về mình ("STAFF").
      handler: z.enum(["AI", "STAFF"]),
    })
    .partial()
    .parse(request.body);
  const existing = await prisma.conversation.findUnique({ where: { id }, select: { handler: true } });
  if (!existing) throw notFound("Cuộc trò chuyện");
  if (input.handler === "AI" && existing.handler !== "AI" && !env.AI_ENABLED) throw aiDisabled();

  const data: Partial<Pick<Conversation, "status" | "staffId" | "handler" | "handoffReason" | "handoffAt">> = { ...input };
  if (input.handler === "STAFF" && existing.handler === "AI") {
    data.handoffReason = "STAFF_TAKEOVER";
    data.handoffAt = new Date();
  }
  const updated = await prisma.conversation.update({ where: { id }, data, include: conversationInclude });
  // Trả lại cho AI: nếu tin cuối là của khách thì AI trả lời luôn (service tự bỏ qua khi không cần).
  if (updated.handler === "AI" && existing.handler !== "AI" && updated.status === "OPEN") void scheduleAiReply(id);
  response.json({ data: withAiPending(updated) });
});
