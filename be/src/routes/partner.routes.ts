import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "../generated/prisma/client.js";
import { badRequest, conflict, notFound } from "../lib/http-error.js";
import { idParamSchema, paginated, paginationSchema, toSkipTake } from "../lib/pagination.js";
import { prisma } from "../lib/prisma.js";
import { authenticate, currentUser, requireRole } from "../middlewares/auth.js";
import { createNotification, notifyRoles } from "../services/notification.service.js";
import { phoneSchema } from "../validators/booking.schema.js";

// Đối tác = chủ địa điểm đăng tin lên sàn. Tài khoản USER nộp hồ sơ, ADMIN duyệt thì role thành OWNER.
export const partnerRouter = Router();

partnerRouter.use(authenticate);

const bankFields = {
  bankName: z.string().trim().min(2).max(100),
  bankAccountNumber: z.string().trim().regex(/^\d{6,20}$/, "Số tài khoản gồm 6–20 chữ số"),
  bankAccountName: z.string().trim().min(2).max(100),
};

const profileFields = {
  businessName: z.string().trim().min(2).max(191),
  businessAddress: z.string().trim().min(5).max(500),
  contactPhone: phoneSchema,
  // Mã số thuế 10 hoặc 13 số (chi nhánh); cá nhân cho thuê homestay có thể chưa có.
  taxCode: z.string().trim().regex(/^\d{10}(-\d{3})?$/, "Mã số thuế gồm 10 số hoặc 10 số-3 số").nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
};

const applySchema = z.object({
  ...profileFields,
  bankName: bankFields.bankName.optional(),
  bankAccountNumber: bankFields.bankAccountNumber.optional(),
  bankAccountName: bankFields.bankAccountName.optional(),
  acceptPartnerTerms: z.literal(true, { error: "Cần đồng ý điều khoản đối tác" }),
});

const updateProfileSchema = z
  .object({ ...profileFields, ...bankFields })
  .partial();

const profileInclude = {
  user: { select: { id: true, name: true, email: true, phone: true, role: true, status: true } },
  reviewedBy: { select: { id: true, name: true } },
} as const satisfies Prisma.PartnerProfileInclude;

// ---------- Phía người nộp hồ sơ ----------

partnerRouter.post("/apply", async (request, response) => {
  const user = currentUser(request);
  const { acceptPartnerTerms: _accepted, ...input } = applySchema.parse(request.body);
  if (user.role !== "USER") throw conflict("Chỉ tài khoản khách hàng mới nộp hồ sơ đối tác", "INVALID_ROLE");

  const existing = await prisma.partnerProfile.findUnique({ where: { userId: user.id } });
  if (existing && existing.status !== "REJECTED") {
    throw conflict("Bạn đã có hồ sơ đối tác", "ALREADY_APPLIED");
  }

  // Hồ sơ bị từ chối được sửa và nộp lại.
  const profile = existing
    ? await prisma.partnerProfile.update({
        where: { id: existing.id },
        data: { ...input, status: "PENDING", rejectReason: null, reviewedAt: null, reviewedById: null },
      })
    : await prisma.partnerProfile.create({ data: { ...input, userId: user.id } });

  await notifyRoles(["ADMIN"], {
    type: "PARTNER",
    title: "Hồ sơ đối tác mới",
    body: `${input.businessName} vừa nộp hồ sơ trở thành đối tác.`,
    data: { partnerProfileId: profile.id },
  });
  response.status(201).json({ data: profile });
});

partnerRouter.get("/me", async (request, response) => {
  const profile = await prisma.partnerProfile.findUnique({ where: { userId: currentUser(request).id } });
  if (!profile) throw notFound("hồ sơ đối tác");
  response.json({ data: profile });
});

partnerRouter.patch("/me", async (request, response) => {
  const input = updateProfileSchema.parse(request.body);
  const profile = await prisma.partnerProfile.findUnique({ where: { userId: currentUser(request).id } });
  if (!profile) throw notFound("hồ sơ đối tác");
  if (profile.status === "SUSPENDED") throw conflict("Tài khoản đối tác đang bị tạm ngưng", "PARTNER_SUSPENDED");
  response.json({ data: await prisma.partnerProfile.update({ where: { id: profile.id }, data: input }) });
});

// ---------- Phía ADMIN ----------

partnerRouter.get("/", requireRole("ADMIN"), async (request, response) => {
  const query = paginationSchema
    .extend({ status: z.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]).optional(), q: z.string().trim().optional() })
    .parse(request.query);
  const where: Prisma.PartnerProfileWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.q
      ? { OR: [{ businessName: { contains: query.q } }, { user: { email: { contains: query.q } } }] }
      : {}),
  };
  const { skip, take } = toSkipTake(query);
  const [data, total] = await prisma.$transaction([
    prisma.partnerProfile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: { ...profileInclude, user: { select: { ...profileInclude.user.select, _count: { select: { ownedDestinations: true } } } } },
    }),
    prisma.partnerProfile.count({ where }),
  ]);
  response.json(paginated(data, total, query));
});

partnerRouter.get("/:id", requireRole("ADMIN"), async (request, response) => {
  const { id } = idParamSchema.parse(request.params);
  const profile = await prisma.partnerProfile.findUnique({ where: { id }, include: profileInclude });
  if (!profile) throw notFound("hồ sơ đối tác");
  response.json({ data: profile });
});

partnerRouter.patch("/:id/review", requireRole("ADMIN"), async (request, response) => {
  const { id } = idParamSchema.parse(request.params);
  const input = z
    .object({
      status: z.enum(["APPROVED", "REJECTED"]),
      commissionRate: z.number().min(0).max(0.5).optional(),
      rejectReason: z.string().trim().min(3).max(500).optional(),
    })
    .parse(request.body);

  const profile = await prisma.partnerProfile.findUnique({ where: { id } });
  if (!profile) throw notFound("hồ sơ đối tác");
  if (profile.status !== "PENDING") throw conflict("Chỉ duyệt được hồ sơ đang chờ", "INVALID_PARTNER_STATUS");
  if (input.status === "REJECTED" && !input.rejectReason) {
    throw badRequest("Cần nhập lý do từ chối", "REJECT_REASON_REQUIRED");
  }
  // Phải có tài khoản ngân hàng để sàn chuyển doanh thu cho đối tác.
  if (input.status === "APPROVED" && (!profile.bankName || !profile.bankAccountNumber || !profile.bankAccountName)) {
    throw conflict("Hồ sơ chưa có thông tin tài khoản ngân hàng nhận tiền", "PARTNER_BANK_REQUIRED");
  }

  const admin = currentUser(request);
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.partnerProfile.update({
      where: { id },
      data: {
        status: input.status,
        commissionRate: input.commissionRate,
        rejectReason: input.status === "REJECTED" ? input.rejectReason : null,
        reviewedById: admin.id,
        reviewedAt: new Date(),
      },
      include: profileInclude,
    });
    if (input.status === "APPROVED") await tx.user.update({ where: { id: profile.userId }, data: { role: "OWNER" } });
    await createNotification(
      {
        userId: profile.userId,
        type: "PARTNER",
        title: input.status === "APPROVED" ? "Hồ sơ đối tác đã được duyệt" : "Hồ sơ đối tác bị từ chối",
        body:
          input.status === "APPROVED"
            ? "Bạn đã có thể đăng địa điểm. Vui lòng đăng nhập lại để vào trang quản lý."
            : `Lý do: ${input.rejectReason}. Bạn có thể cập nhật và nộp lại.`,
        data: { partnerProfileId: id },
      },
      tx,
    );
    return result;
  });
  response.json({ data: updated });
});

// Tạm ngưng: hạ về USER và ẩn toàn bộ địa điểm. Mở lại: trả quyền OWNER (địa điểm do đối tác tự bật lại).
partnerRouter.patch("/:id/status", requireRole("ADMIN"), async (request, response) => {
  const { id } = idParamSchema.parse(request.params);
  const { status, reason } = z
    .object({ status: z.enum(["APPROVED", "SUSPENDED"]), reason: z.string().trim().max(500).optional() })
    .parse(request.body);

  const profile = await prisma.partnerProfile.findUnique({ where: { id } });
  if (!profile) throw notFound("hồ sơ đối tác");
  const allowed = (profile.status === "APPROVED" && status === "SUSPENDED") || (profile.status === "SUSPENDED" && status === "APPROVED");
  if (!allowed) throw conflict(`Không thể chuyển hồ sơ từ ${profile.status} sang ${status}`, "INVALID_PARTNER_STATUS");

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.partnerProfile.update({ where: { id }, data: { status }, include: profileInclude });
    await tx.user.update({ where: { id: profile.userId }, data: { role: status === "SUSPENDED" ? "USER" : "OWNER" } });
    if (status === "SUSPENDED") {
      await tx.destination.updateMany({ where: { ownerId: profile.userId }, data: { isActive: false } });
    }
    await createNotification(
      {
        userId: profile.userId,
        type: "PARTNER",
        title: status === "SUSPENDED" ? "Tài khoản đối tác bị tạm ngưng" : "Tài khoản đối tác đã được mở lại",
        body:
          status === "SUSPENDED"
            ? `Các địa điểm của bạn đã tạm ẩn.${reason ? ` Lý do: ${reason}` : ""}`
            : "Bạn có thể quản lý và bật lại các địa điểm của mình.",
        data: { partnerProfileId: id },
      },
      tx,
    );
    return result;
  });
  response.json({ data: updated });
});

// Đổi tỷ lệ hoa hồng chỉ áp dụng cho booking mới; booking cũ giữ tỷ lệ đã chụp lại.
partnerRouter.patch("/:id/commission", requireRole("ADMIN"), async (request, response) => {
  const { id } = idParamSchema.parse(request.params);
  const { commissionRate } = z.object({ commissionRate: z.number().min(0).max(0.5) }).parse(request.body);
  response.json({ data: await prisma.partnerProfile.update({ where: { id }, data: { commissionRate } }) });
});
