// Đánh giá mẫu cho các địa điểm: mỗi đánh giá gắn với một booking đã hoàn thành (BR-02), do các tài khoản khách mẫu viết.
// Booking của đánh giá mẫu được gom vào một kỳ đối soát đã chuyển tiền cho từng chủ, để "tiền chưa đối soát" của chủ
// không bị phình bởi dữ liệu mẫu. Đánh dấu bằng note để chỉ tạo một lần.
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../../src/lib/prisma.js";
import { generateBookingCode } from "../../src/services/booking-rules.js";
import { refreshDestinationRating } from "../../src/services/destination.service.js";

const REVIEW_NOTE = "[seed-review]";
const DAY = 24 * 60 * 60 * 1000;

const reviewers = [
  { email: "khach.lan@travelling.app", name: "Phạm Ngọc Lan" },
  { email: "khach.minh@travelling.app", name: "Hoàng Đức Minh" },
  { email: "khach.thao@travelling.app", name: "Nguyễn Phương Thảo" },
  { email: "khach.tuan@travelling.app", name: "Trần Anh Tuấn" },
  { email: "khach.huong@travelling.app", name: "Lê Thu Hương" },
  { email: "khach.khoa@travelling.app", name: "Bùi Đăng Khoa" },
  { email: "khach.vy@travelling.app", name: "Đặng Tường Vy" },
  { email: "khach.son@travelling.app", name: "Vũ Hải Sơn" },
];

const comments: Record<number, string[]> = {
  5: [
    "Cảnh đẹp hơn ảnh, nhân viên nhiệt tình, nhất định sẽ quay lại.",
    "Phòng sạch, bữa sáng ngon, vị trí rất thuận tiện đi lại.",
    "Chuyến đi đáng nhớ của cả gia đình, trẻ con rất thích.",
    "Dịch vụ chu đáo, check-in nhanh, giá hợp lý so với chất lượng.",
  ],
  4: [
    "Tổng thể tốt, phòng hơi nhỏ nhưng view bù lại.",
    "Đồ ăn ngon, cuối tuần hơi đông nên phải chờ một chút.",
    "Nhân viên thân thiện, wifi đôi lúc chập chờn.",
    "Đáng tiền, chỉ tiếc trời mưa nên chưa đi được hết các điểm.",
  ],
  3: [
    "Ổn so với giá, cách âm chưa tốt lắm.",
    "Vị trí đẹp nhưng cơ sở vật chất hơi cũ, cần bảo trì thêm.",
  ],
};

// Số lượng và điểm đánh giá theo vị trí địa điểm, cố định để chạy lại cho ra cùng kết quả.
const ratingPatterns = [[5, 5, 4], [4, 5], [5, 4, 4, 5], [5], [4, 3, 5], [5, 5], [4, 4, 5, 3], [5, 4]];

export async function seedSampleReviews(moderatorId: number) {
  if ((await prisma.booking.count({ where: { note: REVIEW_NOTE } })) > 0) return;

  // Tài khoản khách mẫu chỉ để làm tác giả đánh giá: mật khẩu ngẫu nhiên, không ai đăng nhập được.
  const users = [];
  for (const reviewer of reviewers) {
    const password = await bcrypt.hash(randomBytes(24).toString("hex"), 10);
    users.push(
      await prisma.user.upsert({
        where: { email: reviewer.email },
        update: {},
        create: { ...reviewer, password, emailVerifiedAt: new Date() },
      }),
    );
  }

  const destinations = await prisma.destination.findMany({
    where: { listingStatus: "APPROVED", isActive: true },
    orderBy: { id: "asc" },
    include: {
      packages: { where: { isActive: true }, orderBy: { price: "asc" }, take: 1 },
      roomTypes: { where: { isActive: true }, orderBy: { pricePerNight: "asc" }, take: 1 },
      owner: { select: { partnerProfile: { select: { commissionRate: true } } } },
    },
  });

  const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
  // Kỳ đối soát đã chuyển của từng chủ: ownerId → các booking gom vào.
  const payoutGroups = new Map<number, { ids: number[]; gross: number; commission: number; first: Date; last: Date }>();

  for (const [index, destination] of destinations.entries()) {
    const [pkg] = destination.packages;
    const [room] = destination.roomTypes;
    if (!pkg || !room) continue;
    const ratings = ratingPatterns[index % ratingPatterns.length];

    for (const [order, rating] of ratings.entries()) {
      const user = users[(index + order * 3) % users.length];
      // Chuyến đi trong khoảng 40–250 ngày trước, khác nhau giữa các đánh giá.
      const checkIn = new Date(today.getTime() - (40 + ((index * 37 + order * 53) % 210)) * DAY);
      const nights = Math.max(pkg.durationNights, 1);
      const checkOut = new Date(checkIn.getTime() + nights * DAY);
      const createdAt = new Date(checkIn.getTime() - 12 * DAY + 3 * 60 * 60 * 1000);
      const subtotal = pkg.price + room.pricePerNight * nights;
      const tax = Math.round(subtotal * 0.08);
      const rate = destination.ownerId ? (destination.owner?.partnerProfile?.commissionRate ?? 1) : 1;
      const commissionAmount = Math.round(subtotal * rate);
      const pool = comments[rating];

      const booking = await prisma.booking.create({
        data: {
          code: generateBookingCode(createdAt),
          status: "COMPLETED",
          userId: user.id,
          destinationId: destination.id,
          packageId: pkg.id,
          roomTypeId: room.id,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          nights,
          guests: 2,
          roomsCount: 1,
          contactName: user.name,
          contactPhone: "0900000000",
          contactEmail: user.email,
          note: REVIEW_NOTE,
          packagePrice: pkg.price,
          roomPrice: room.pricePerNight * nights,
          servicesPrice: 0,
          subtotal,
          taxAmount: tax,
          totalAmount: subtotal + tax,
          commissionRate: rate,
          commissionAmount,
          ownerRevenue: subtotal - commissionAmount,
          createdAt,
          confirmedAt: createdAt,
          completedAt: new Date(checkOut.getTime() + 5 * 60 * 60 * 1000),
          payment: { create: { method: "ONLINE_MOCK", status: "PAID", channel: "CARD", amount: subtotal + tax, paidAt: createdAt } },
          review: {
            create: {
              userId: user.id,
              destinationId: destination.id,
              rating,
              comment: pool[(index + order) % pool.length],
              status: "APPROVED",
              moderatedById: moderatorId,
              moderatedAt: new Date(checkOut.getTime() + DAY),
              createdAt: new Date(checkOut.getTime() + 6 * 60 * 60 * 1000),
            },
          },
        },
      });

      if (destination.ownerId) {
        const group = payoutGroups.get(destination.ownerId) ?? { ids: [], gross: 0, commission: 0, first: checkOut, last: checkOut };
        group.ids.push(booking.id);
        group.gross += subtotal;
        group.commission += commissionAmount;
        if (checkOut < group.first) group.first = checkOut;
        if (checkOut > group.last) group.last = checkOut;
        payoutGroups.set(destination.ownerId, group);
      }
    }
    await refreshDestinationRating(destination.id);
  }

  for (const [ownerId, group] of payoutGroups) {
    const profile = await prisma.partnerProfile.findUnique({ where: { userId: ownerId } });
    await prisma.payout.create({
      data: {
        ownerId,
        periodStart: group.first,
        periodEnd: group.last,
        bookingCount: group.ids.length,
        grossAmount: group.gross,
        commissionAmount: group.commission,
        amount: group.gross - group.commission,
        status: "PAID",
        bankName: profile?.bankName,
        bankAccountNumber: profile?.bankAccountNumber,
        bankAccountName: profile?.bankAccountName,
        transferRef: `SEED-${ownerId}`,
        note: REVIEW_NOTE,
        paidAt: new Date(group.last.getTime() + 3 * DAY),
        createdById: moderatorId,
        bookings: { connect: group.ids.map((id) => ({ id })) },
      },
    });
  }
}
