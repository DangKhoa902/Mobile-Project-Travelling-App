import { badRequest, conflict, notFound } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";
import type { AuthUser } from "../middlewares/auth.js";
import { refreshDestinationRating } from "./destination.service.js";
import { audit } from "./audit.service.js";
import { createNotification } from "./notification.service.js";

type ReviewInput = { bookingId: number; rating: number; comment?: string; imageUrls?: string[] };

// Ảnh đính kèm phải do chính người viết tải lên qua /api/uploads (purpose=review).
async function assertOwnReviewImages(userId: number, urls: string[] | undefined) {
  if (!urls?.length) return;
  const owned = await prisma.upload.count({ where: { userId, purpose: "review", url: { in: urls } } });
  if (owned !== new Set(urls).size) throw badRequest("Ảnh đánh giá không hợp lệ", "INVALID_IMAGE");
}

const imageRows = (urls: string[]) => urls.map((url, sortOrder) => ({ url, sortOrder }));

export async function createReview(user: AuthUser, input: ReviewInput) {
  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    select: { id: true, userId: true, status: true, destinationId: true, review: { select: { id: true } } },
  });
  if (!booking || booking.userId !== user.id) throw notFound("Booking");
  // BR-02: chỉ đánh giá sau khi đã hoàn thành chuyến đi.
  if (booking.status !== "COMPLETED") throw conflict("Chỉ được đánh giá sau khi hoàn thành chuyến đi", "BOOKING_NOT_COMPLETED");
  // BR-08: mỗi booking chỉ có một review; muốn sửa thì dùng PATCH.
  if (booking.review) throw conflict("Booking này đã được đánh giá", "ALREADY_REVIEWED");
  await assertOwnReviewImages(user.id, input.imageUrls);

  return prisma.review.create({
    data: {
      userId: user.id,
      destinationId: booking.destinationId,
      bookingId: booking.id,
      rating: input.rating,
      comment: input.comment,
      images: input.imageUrls ? { create: imageRows(input.imageUrls) } : undefined,
    },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });
}

// Sửa review sẽ đưa về trạng thái chờ duyệt lại để tránh lách kiểm duyệt.
export async function updateReview(user: AuthUser, id: number, input: Partial<Omit<ReviewInput, "bookingId">>) {
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review || review.userId !== user.id) throw notFound("Review");

  const { imageUrls, ...fields } = input;
  await assertOwnReviewImages(user.id, imageUrls);
  const updated = await prisma.review.update({
    where: { id },
    data: {
      ...fields,
      // Gửi imageUrls = thay toàn bộ ảnh; không gửi = giữ nguyên.
      images: imageUrls ? { deleteMany: {}, create: imageRows(imageUrls) } : undefined,
      status: "PENDING",
      moderatedAt: null,
      moderatedById: null,
      rejectReason: null,
    },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });
  if (review.status === "APPROVED") await refreshDestinationRating(review.destinationId);
  return updated;
}

export async function deleteReview(user: AuthUser, id: number) {
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review || review.userId !== user.id) throw notFound("Review");
  await prisma.review.delete({ where: { id } });
  if (review.status === "APPROVED") await refreshDestinationRating(review.destinationId);
}

export async function moderateReview(moderator: AuthUser, id: number, status: "APPROVED" | "REJECTED", rejectReason?: string) {
  if (status === "REJECTED" && !rejectReason) throw badRequest("Cần nhập lý do từ chối", "REJECT_REASON_REQUIRED");

  return prisma.$transaction(async (tx) => {
    const review = await tx.review.findUnique({ where: { id }, include: { destination: { select: { name: true } } } });
    if (!review) throw notFound("Review");

    const updated = await tx.review.update({
      where: { id },
      data: {
        status,
        rejectReason: status === "REJECTED" ? rejectReason : null,
        moderatedById: moderator.id,
        moderatedAt: new Date(),
      },
    });
    await audit({ actorId: moderator.id, action: status === "APPROVED" ? "review.approve" : "review.reject", entity: "Review", entityId: id, before: { status: review.status }, after: { status, rejectReason } }, tx);
    await refreshDestinationRating(review.destinationId, tx);
    await createNotification(
      {
        userId: review.userId,
        type: "REVIEW",
        title: status === "APPROVED" ? "Đánh giá đã được duyệt" : "Đánh giá bị từ chối",
        body:
          status === "APPROVED"
            ? `Đánh giá của bạn về ${review.destination.name} đã được hiển thị.`
            : `Đánh giá của bạn về ${review.destination.name} bị từ chối: ${rejectReason}`,
        data: { reviewId: id, destinationId: review.destinationId },
      },
      tx,
    );
    return updated;
  });
}
