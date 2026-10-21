// Dữ liệu mẫu cho dev/demo. Chạy: npm run db:seed (an toàn khi chạy lại nhiều lần).
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";
import { refreshDestinationMinPrice, refreshDestinationRating } from "../src/services/destination.service.js";
import { generateBookingCode } from "../src/services/booking-rules.js";

const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? "Password123";

const image = (seed: string) => `https://picsum.photos/seed/${seed}/1200/800`;

const categories = [
  { name: "Biển", slug: "bien", iconName: "beach" },
  { name: "Núi", slug: "nui", iconName: "terrain" },
  { name: "Resort", slug: "resort", iconName: "pool" },
  { name: "Khách sạn", slug: "khach-san", iconName: "hotel" },
  { name: "Khu vui chơi", slug: "khu-vui-choi", iconName: "attractions" },
  { name: "Di tích lịch sử", slug: "di-tich-lich-su", iconName: "account-balance" },
  { name: "Văn hóa", slug: "van-hoa", iconName: "museum" },
  { name: "Sinh thái", slug: "sinh-thai", iconName: "park" },
];

const facilities = [
  { name: "Wi-Fi", iconName: "wifi" },
  { name: "Hồ bơi", iconName: "pool" },
  { name: "Bữa sáng", iconName: "free-breakfast" },
  { name: "Bãi đỗ xe", iconName: "local-parking" },
  { name: "Spa", iconName: "spa" },
  { name: "Phòng gym", iconName: "fitness-center" },
  { name: "Đưa đón sân bay", iconName: "airport-shuttle" },
  { name: "Nhà hàng", iconName: "restaurant" },
];

type SeedDestination = {
  name: string;
  slug: string;
  category: string;
  location: string;
  address: string;
  latitude: number;
  longitude: number;
  description: string;
  isFeatured: boolean;
  facilities: string[];
  packages: { name: string; durationDays: number; durationNights: number; price: number; inclusions: string[]; freeCancellationHours?: number }[];
  roomTypes: { name: string; capacity: number; pricePerNight: number; totalRooms: number }[];
  services: { name: string; price: number; pricingUnit: "PER_BOOKING" | "PER_GUEST" | "PER_NIGHT" }[];
};

const destinations: SeedDestination[] = [
  {
    name: "Đà Lạt Pine Hill Resort",
    slug: "da-lat-pine-hill-resort",
    category: "resort",
    location: "Đà Lạt",
    address: "Đường Trần Hưng Đạo, Phường 10, Đà Lạt, Lâm Đồng",
    latitude: 11.9404,
    longitude: 108.4583,
    description: "Khu nghỉ dưỡng giữa đồi thông, view hồ Xuân Hương, khí hậu mát mẻ quanh năm.",
    isFeatured: true,
    facilities: ["Wi-Fi", "Bữa sáng", "Bãi đỗ xe", "Spa", "Nhà hàng"],
    packages: [
      { name: "Gói Standard", durationDays: 2, durationNights: 1, price: 1_200_000, inclusions: ["Phòng Standard", "Ăn sáng"] },
      { name: "Gói Premium", durationDays: 3, durationNights: 2, price: 2_000_000, inclusions: ["Phòng Deluxe", "Ăn sáng", "Đưa đón"] },
      { name: "Gói VIP", durationDays: 4, durationNights: 3, price: 3_500_000, inclusions: ["Phòng Suite", "Ăn sáng", "Spa", "Đưa đón"], freeCancellationHours: 72 },
    ],
    roomTypes: [
      { name: "Standard Room", capacity: 2, pricePerNight: 300_000, totalRooms: 20 },
      { name: "Deluxe Room", capacity: 2, pricePerNight: 500_000, totalRooms: 10 },
      { name: "Family Room", capacity: 4, pricePerNight: 800_000, totalRooms: 6 },
      { name: "Suite", capacity: 3, pricePerNight: 1_500_000, totalRooms: 2 },
    ],
    services: [
      { name: "Đưa đón sân bay Liên Khương", price: 200_000, pricingUnit: "PER_BOOKING" },
      { name: "Spa thư giãn 60 phút", price: 300_000, pricingUnit: "PER_GUEST" },
      { name: "Giường phụ", price: 150_000, pricingUnit: "PER_NIGHT" },
      { name: "Hướng dẫn viên city tour", price: 500_000, pricingUnit: "PER_BOOKING" },
    ],
  },
  {
    name: "Mỹ Khê Beach Hotel",
    slug: "my-khe-beach-hotel",
    category: "bien",
    location: "Đà Nẵng",
    address: "Võ Nguyên Giáp, Phước Mỹ, Sơn Trà, Đà Nẵng",
    latitude: 16.0599,
    longitude: 108.2465,
    description: "Khách sạn sát bãi biển Mỹ Khê, gần cầu Rồng và chợ đêm Sơn Trà.",
    isFeatured: true,
    facilities: ["Wi-Fi", "Hồ bơi", "Bữa sáng", "Phòng gym", "Đưa đón sân bay"],
    packages: [
      { name: "Nghỉ dưỡng biển 3N2Đ", durationDays: 3, durationNights: 2, price: 1_500_000, inclusions: ["Ăn sáng", "Ghế tắm nắng"] },
      { name: "Combo Bà Nà Hills", durationDays: 3, durationNights: 2, price: 2_800_000, inclusions: ["Ăn sáng", "Vé cáp treo Bà Nà"] },
    ],
    roomTypes: [
      { name: "Superior City View", capacity: 2, pricePerNight: 650_000, totalRooms: 15 },
      { name: "Deluxe Ocean View", capacity: 2, pricePerNight: 950_000, totalRooms: 10 },
    ],
    services: [
      { name: "Đưa đón sân bay Đà Nẵng", price: 150_000, pricingUnit: "PER_BOOKING" },
      { name: "Thuê xe máy", price: 120_000, pricingUnit: "PER_NIGHT" },
    ],
  },
  {
    name: "Phú Quốc Sunset Resort",
    slug: "phu-quoc-sunset-resort",
    category: "resort",
    location: "Phú Quốc",
    address: "Bãi Trường, Dương Tơ, Phú Quốc, Kiên Giang",
    latitude: 10.1699,
    longitude: 103.9676,
    description: "Resort ven biển Bãi Trường với hoàng hôn đẹp nhất đảo ngọc.",
    isFeatured: true,
    facilities: ["Wi-Fi", "Hồ bơi", "Bữa sáng", "Spa", "Nhà hàng", "Đưa đón sân bay"],
    packages: [
      { name: "Đảo ngọc 4N3Đ", durationDays: 4, durationNights: 3, price: 3_000_000, inclusions: ["Ăn sáng", "Tour 4 đảo"] },
    ],
    roomTypes: [
      { name: "Garden Bungalow", capacity: 2, pricePerNight: 1_200_000, totalRooms: 12 },
      { name: "Beachfront Villa", capacity: 4, pricePerNight: 3_200_000, totalRooms: 4 },
    ],
    services: [{ name: "Lặn ngắm san hô", price: 450_000, pricingUnit: "PER_GUEST" }],
  },
  {
    name: "Vịnh Hạ Long Cruise",
    slug: "vinh-ha-long-cruise",
    category: "sinh-thai",
    location: "Quảng Ninh",
    address: "Cảng tàu quốc tế Tuần Châu, Hạ Long, Quảng Ninh",
    latitude: 20.9101,
    longitude: 107.1839,
    description: "Du thuyền ngủ đêm trên vịnh, chèo kayak hang Luồn và ngắm bình minh trên boong.",
    isFeatured: false,
    facilities: ["Wi-Fi", "Nhà hàng", "Bãi đỗ xe"],
    packages: [{ name: "Du thuyền 2N1Đ", durationDays: 2, durationNights: 1, price: 2_500_000, inclusions: ["Ăn 3 bữa", "Kayak", "Vé tham quan"] }],
    roomTypes: [{ name: "Cabin Deluxe", capacity: 2, pricePerNight: 900_000, totalRooms: 8 }],
    services: [{ name: "Xe limousine Hà Nội - Hạ Long", price: 300_000, pricingUnit: "PER_GUEST" }],
  },
  {
    name: "Hội An Ancient Homestay",
    slug: "hoi-an-ancient-homestay",
    category: "van-hoa",
    location: "Hội An",
    address: "Trần Phú, Minh An, Hội An, Quảng Nam",
    latitude: 15.8771,
    longitude: 108.3266,
    description: "Homestay nhà cổ trong phố Hội An, cách chùa Cầu 5 phút đi bộ.",
    isFeatured: false,
    facilities: ["Wi-Fi", "Bữa sáng"],
    packages: [{ name: "Phố cổ 2N1Đ", durationDays: 2, durationNights: 1, price: 600_000, inclusions: ["Ăn sáng", "Thả đèn hoa đăng"] }],
    roomTypes: [{ name: "Phòng đôi", capacity: 2, pricePerNight: 400_000, totalRooms: 5 }],
    services: [{ name: "Lớp học nấu ăn", price: 350_000, pricingUnit: "PER_GUEST" }],
  },
  {
    name: "Sa Pa Mountain Lodge",
    slug: "sa-pa-mountain-lodge",
    category: "nui",
    location: "Lào Cai",
    address: "Thị xã Sa Pa, Lào Cai",
    latitude: 22.3364,
    longitude: 103.8438,
    description: "Lodge nhìn thẳng ruộng bậc thang Mường Hoa, điểm xuất phát chinh phục Fansipan.",
    isFeatured: true,
    facilities: ["Wi-Fi", "Bữa sáng", "Nhà hàng", "Bãi đỗ xe"],
    packages: [{ name: "Chinh phục Fansipan 3N2Đ", durationDays: 3, durationNights: 2, price: 1_800_000, inclusions: ["Ăn sáng", "Vé cáp treo Fansipan"] }],
    roomTypes: [
      { name: "Standard Mountain View", capacity: 2, pricePerNight: 550_000, totalRooms: 10 },
      { name: "Family Bungalow", capacity: 5, pricePerNight: 1_100_000, totalRooms: 3 },
    ],
    services: [{ name: "Porter leo núi", price: 400_000, pricingUnit: "PER_BOOKING" }],
  },
];

async function main() {
  const password = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const accounts = [
    { email: "admin@travelling.app", name: "Quản trị viên", role: "ADMIN" as const },
    { email: "staff@travelling.app", name: "Nhân viên CSKH", role: "STAFF" as const },
    { email: "user@travelling.app", name: "Nguyễn Văn A", role: "USER" as const, phone: "0901234567" },
  ];
  const users = Object.fromEntries(
    await Promise.all(
      accounts.map(async (account) => [
        account.role,
        await prisma.user.upsert({ where: { email: account.email }, update: {}, create: { ...account, password } }),
      ]),
    ),
  );

  for (const category of categories) {
    await prisma.category.upsert({ where: { slug: category.slug }, update: {}, create: category });
  }
  for (const facility of facilities) {
    await prisma.facility.upsert({ where: { name: facility.name }, update: {}, create: facility });
  }

  for (const item of destinations) {
    const exists = await prisma.destination.findUnique({ where: { slug: item.slug }, select: { id: true } });
    if (exists) continue;

    const destination = await prisma.destination.create({
      data: {
        name: item.name,
        slug: item.slug,
        location: item.location,
        address: item.address,
        latitude: item.latitude,
        longitude: item.longitude,
        description: item.description,
        isFeatured: item.isFeatured,
        imageUrl: image(item.slug),
        contactPhone: "19001234",
        contactEmail: "booking@travelling.app",
        policy: "Nhận phòng từ 14:00, trả phòng trước 12:00. Không hút thuốc trong phòng.",
        category: { connect: { slug: item.category } },
        facilities: { connect: item.facilities.map((name) => ({ name })) },
        images: { create: [1, 2, 3].map((index) => ({ url: image(`${item.slug}-${index}`), sortOrder: index })) },
        packages: { create: item.packages },
        roomTypes: { create: item.roomTypes },
        services: { create: item.services },
      },
    });
    await refreshDestinationMinPrice(destination.id);
  }

  const now = new Date();
  await prisma.voucher.upsert({
    where: { code: "WELCOME10" },
    update: {},
    create: {
      code: "WELCOME10",
      description: "Giảm 10% tối đa 200.000đ cho đơn từ 1.000.000đ",
      discountType: "PERCENT",
      value: 10,
      maxDiscount: 200_000,
      minOrderValue: 1_000_000,
      usageLimit: 1000,
      startsAt: now,
      endsAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  // Một chuyến đi đã hoàn thành + review để demo luồng đánh giá và rating.
  const demoUser = users.USER;
  if ((await prisma.booking.count({ where: { userId: demoUser.id } })) === 0) {
    const destination = await prisma.destination.findUniqueOrThrow({
      where: { slug: "da-lat-pine-hill-resort" },
      include: { packages: { take: 1, orderBy: { price: "asc" } }, roomTypes: { take: 1, orderBy: { pricePerNight: "asc" } } },
    });
    const [pkg] = destination.packages;
    const [room] = destination.roomTypes;
    const subtotal = pkg.price + room.pricePerNight;
    const tax = Math.round(subtotal * 0.08);
    const booking = await prisma.booking.create({
      data: {
        code: generateBookingCode(new Date("2026-09-01T03:00:00Z")),
        status: "COMPLETED",
        userId: demoUser.id,
        destinationId: destination.id,
        packageId: pkg.id,
        roomTypeId: room.id,
        checkInDate: new Date("2026-09-01T00:00:00Z"),
        checkOutDate: new Date("2026-09-02T00:00:00Z"),
        nights: 1,
        guests: 2,
        roomsCount: 1,
        contactName: demoUser.name,
        contactPhone: "0901234567",
        contactEmail: demoUser.email,
        packagePrice: pkg.price,
        roomPrice: room.pricePerNight,
        servicesPrice: 0,
        subtotal,
        taxAmount: tax,
        totalAmount: subtotal + tax,
        confirmedAt: new Date("2026-08-20T03:00:00Z"),
        completedAt: new Date("2026-09-02T05:00:00Z"),
        payment: { create: { method: "ONLINE_MOCK", status: "PAID", amount: subtotal + tax, paidAt: new Date("2026-08-20T03:00:00Z") } },
      },
    });
    await prisma.review.create({
      data: {
        userId: demoUser.id,
        destinationId: destination.id,
        bookingId: booking.id,
        rating: 5,
        comment: "Phòng sạch, view đồi thông rất đẹp, nhân viên thân thiện.",
        status: "APPROVED",
        moderatedById: users.STAFF.id,
        moderatedAt: new Date(),
      },
    });
    await refreshDestinationRating(destination.id);
  }

  console.log(`Seed completed. Demo accounts (password: ${DEFAULT_PASSWORD}):`);
  for (const account of accounts) console.log(`  ${account.role.padEnd(5)} ${account.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
