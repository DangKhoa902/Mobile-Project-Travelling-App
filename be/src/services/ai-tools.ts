import type { FunctionDeclaration } from "@google/genai";
import { env } from "../config/env.js";
import { buildDestinationWhere, destinationDao } from "../dao/destination.dao.js";
import type { Prisma } from "../generated/prisma/client.js";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";
import type { AuthUser } from "../middlewares/auth.js";
import { listBookingsSchema, quoteBookingSchema } from "../validators/booking.schema.js";
import { listDestinationsSchema } from "../validators/destination.schema.js";
import { checkCustomerCancellation } from "./booking-rules.js";
import { getBooking, listBookings, quoteBooking } from "./booking.service.js";

// Tool cho Trợ lý AI (docs/02-thiet-ke/ai-cskh.md mục 6). AI chỉ đọc dữ liệu qua đây:
// mọi tool gọi lại service/DAO sẵn có nên quy tắc nghiệp vụ không bị viết lại, và kết quả
// được lọc theo danh sách trường cho phép để không lộ email, số điện thoại, địa chỉ của khách.

export const HANDOFF_TOOL = "handoff_to_staff";
const MAX_SEARCH_RESULTS = 5;
const MAX_DESCRIPTION_CHARS = 1500;

// Tool dùng chung cho CSKH và trợ lý tư vấn công khai (chỉ đọc dữ liệu công khai, không cần biết khách là ai).
export const publicToolDeclarations: FunctionDeclaration[] = [
  {
    name: "search_destinations",
    description: "Tìm địa điểm du lịch đang mở bán. Trả về tối đa 5 địa điểm kèm giá thấp nhất và điểm đánh giá.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Từ khóa: tên địa điểm, thành phố, loại hình (có dấu hoặc không dấu)" },
        location: { type: "string", description: "Khu vực, ví dụ Đà Lạt" },
        categorySlug: { type: "string", description: "Slug danh mục, ví dụ resort, homestay" },
        minPrice: { type: "integer", minimum: 0, description: "Giá từ (VNĐ)" },
        maxPrice: { type: "integer", minimum: 0, description: "Giá đến (VNĐ)" },
        minRating: { type: "number", minimum: 0, maximum: 5 },
        limit: { type: "integer", minimum: 1, maximum: MAX_SEARCH_RESULTS },
      },
    },
  },
  {
    name: "get_destination",
    description: "Chi tiết một địa điểm theo slug: gói dịch vụ (packageId), loại phòng (roomTypeId), dịch vụ thêm, chính sách, tiện ích.",
    parametersJsonSchema: {
      type: "object",
      properties: { slug: { type: "string" } },
      required: ["slug"],
    },
  },
  {
    name: "quote_booking",
    description: "Báo giá và kiểm tra phòng trống cho một lựa chọn cụ thể. Mọi con số giá nói với khách phải lấy từ tool này.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        packageId: { type: "integer" },
        roomTypeId: { type: "integer" },
        checkInDate: { type: "string", description: "YYYY-MM-DD" },
        checkOutDate: { type: "string", description: "YYYY-MM-DD" },
        guests: { type: "integer", minimum: 1 },
        roomsCount: { type: "integer", minimum: 1, description: "Mặc định 1" },
        voucherCode: { type: "string" },
      },
      required: ["packageId", "roomTypeId", "checkInDate", "checkOutDate", "guests"],
    },
  },
  {
    name: "get_policies",
    description: "Chính sách chung của Travelling App: hủy, hoàn tiền, hạn thanh toán, đánh giá.",
    parametersJsonSchema: { type: "object", properties: {} },
  },
];

export const cskhToolDeclarations: FunctionDeclaration[] = [
  ...publicToolDeclarations,
  {
    name: "list_my_bookings",
    description: "Danh sách booking của khách đang chat (mới nhất trước).",
    parametersJsonSchema: {
      type: "object",
      properties: { status: { type: "string", enum: ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] } },
    },
  },
  {
    name: "get_my_booking",
    description: "Chi tiết một booking của khách đang chat theo mã (ví dụ TA261021-7K3F9Q), kèm khách có tự hủy được không.",
    parametersJsonSchema: {
      type: "object",
      properties: { code: { type: "string" } },
      required: ["code"],
    },
  },
  {
    name: HANDOFF_TOOL,
    description:
      "Chuyển hội thoại cho nhân viên CSKH khi khách muốn gặp người, khiếu nại, cần hủy/sửa/hoàn tiền mà không tự làm được, hoặc bạn không chắc chắn.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Lý do ngắn, ví dụ: Khách yêu cầu hoàn tiền ngoài chính sách" },
        summary: { type: "string", description: "Tóm tắt cho nhân viên: khách cần gì, đã tra được gì, mã booking liên quan" },
      },
      required: ["reason", "summary"],
    },
  },
];

// Văn bản cố định theo BR-02, BR-06, BR-07, BR-19 (docs/01-dac-ta/quy-tac-nghiep-vu.md).
export function policiesText(paymentTimeoutMinutes = env.PAYMENT_TIMEOUT_MINUTES) {
  return [
    `Thanh toán: booking chọn thanh toán online phải thanh toán trong ${paymentTimeoutMinutes} phút sau khi đặt; quá hạn booking tự hủy và không còn giữ phòng (BR-19).`,
    "Xác nhận: booking thanh toán online chỉ được xác nhận sau khi đã thanh toán; booking trả tiền tại nơi ở do chủ địa điểm hoặc nhân viên xác nhận (BR-06).",
    "Hủy: booking đang chờ xác nhận (PENDING) khách tự hủy được bất kỳ lúc nào trước giờ nhận phòng (14:00). Booking đã xác nhận (CONFIRMED) khách tự hủy được khi còn ít nhất số giờ hủy miễn phí của gói (mặc định 48 giờ) trước giờ nhận phòng; sau mốc đó cần liên hệ nhân viên CSKH (BR-07).",
    "Hoàn tiền: hủy booking đã thanh toán thì khoản thanh toán được hoàn lại. Yêu cầu hoàn tiền ngoài các trường hợp trên do nhân viên CSKH xem xét.",
    "Đánh giá: khách chỉ đánh giá được địa điểm sau khi booking liên quan đã hoàn thành (COMPLETED) (BR-02).",
  ].join("\n");
}

const dateOnly = (value: Date | null | undefined) => (value ? value.toISOString().slice(0, 10) : null);

type BookingLike = {
  code: string;
  status: string;
  checkInDate: Date;
  checkOutDate: Date;
  nights: number;
  guests: number;
  roomsCount: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paymentDueAt?: Date | null;
  cancelledAt?: Date | null;
  cancelReason?: string | null;
  createdAt: Date;
  destination: { name: string; slug: string; location: string };
  package: { name: string };
  roomType: { name: string };
  payment?: { method: string; status: string; paidAt?: Date | null } | null;
};

// Danh sách trường cho phép: không có contactName/Phone/Email, note, user (email, phone), hoa hồng.
export function toBookingForAi(booking: BookingLike) {
  return {
    code: booking.code,
    status: booking.status,
    destination: { name: booking.destination.name, slug: booking.destination.slug, location: booking.destination.location },
    package: booking.package.name,
    roomType: booking.roomType.name,
    checkInDate: dateOnly(booking.checkInDate),
    checkOutDate: dateOnly(booking.checkOutDate),
    nights: booking.nights,
    guests: booking.guests,
    roomsCount: booking.roomsCount,
    subtotal: booking.subtotal,
    discountAmount: booking.discountAmount,
    taxAmount: booking.taxAmount,
    totalAmount: booking.totalAmount,
    payment: booking.payment
      ? { method: booking.payment.method, status: booking.payment.status, paidAt: booking.payment.paidAt ?? null }
      : null,
    paymentDueAt: booking.paymentDueAt ?? null,
    cancelledAt: booking.cancelledAt ?? null,
    cancelReason: booking.cancelReason ?? null,
    createdAt: booking.createdAt,
  };
}

type DestinationDetailLike = {
  name: string;
  slug: string;
  location: string;
  description: string | null;
  policy: string | null;
  minPrice: number;
  averageRating: number;
  reviewCount: number;
  category: { name: string; slug: string } | null;
  facilities: { name: string }[];
  packages: {
    id: number;
    name: string;
    description: string | null;
    inclusions: unknown;
    durationDays: number;
    durationNights: number;
    price: number;
    freeCancellationHours: number;
  }[];
  roomTypes: {
    id: number;
    name: string;
    description: string | null;
    capacity: number;
    pricePerNight: number;
    rates?: { name: string; startDate: Date; endDate: Date; pricePerNight: number }[];
  }[];
  services: { id: number; name: string; price: number; pricingUnit: string }[];
};

// Không gửi thông tin chủ địa điểm; mô tả dài bị cắt để tiết kiệm token.
export function toDestinationForAi(destination: DestinationDetailLike) {
  const description = destination.description ?? "";
  return {
    name: destination.name,
    slug: destination.slug,
    location: destination.location,
    category: destination.category?.name ?? null,
    description: description.length > MAX_DESCRIPTION_CHARS ? `${description.slice(0, MAX_DESCRIPTION_CHARS)}...` : description,
    policy: destination.policy,
    minPrice: destination.minPrice,
    averageRating: destination.averageRating,
    reviewCount: destination.reviewCount,
    facilities: destination.facilities.map((facility) => facility.name),
    packages: destination.packages.map((pkg) => ({
      packageId: pkg.id,
      name: pkg.name,
      description: pkg.description,
      inclusions: pkg.inclusions,
      durationDays: pkg.durationDays,
      durationNights: pkg.durationNights,
      price: pkg.price,
      freeCancellationHours: pkg.freeCancellationHours,
    })),
    roomTypes: destination.roomTypes.map((room) => ({
      roomTypeId: room.id,
      name: room.name,
      description: room.description,
      capacity: room.capacity,
      pricePerNight: room.pricePerNight,
      seasonalRates: (room.rates ?? []).map((rate) => ({
        name: rate.name,
        startDate: dateOnly(rate.startDate),
        endDate: dateOnly(rate.endDate),
        pricePerNight: rate.pricePerNight,
      })),
    })),
    addonServices: destination.services.map((service) => ({
      addonServiceId: service.id,
      name: service.name,
      price: service.price,
      pricingUnit: service.pricingUnit,
    })),
  };
}

// Phụ thuộc tách riêng để unit test thay bằng hàm giả, không cần DB.
export const defaultToolDeps = {
  findDestinations: destinationDao.findMany,
  findDestination: destinationDao.findByIdOrSlug,
  quoteBooking,
  listBookings,
  getBooking,
  findBookingIdByCode: async (userId: number, code: string) =>
    (await prisma.booking.findFirst({ where: { code, userId }, select: { id: true } }))?.id ?? null,
};

export type ToolDeps = typeof defaultToolDeps;
export type ToolResult = Record<string, unknown>;

const toolError = (code: string, message: string): ToolResult => ({ error: { code, message } });
const str = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined);
const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : undefined);

type ToolHandlers = Record<string, (args: Record<string, unknown>) => Promise<ToolResult>>;

// Địa điểm mà tool đã trả cho AI (để API trợ lý tư vấn trả kèm thẻ địa điểm).
export type CollectedDestination = { id: number; slug: string; name: string };

// Tool đọc dữ liệu công khai: tìm / xem địa điểm, báo giá, chính sách.
function publicHandlers(deps: ToolDeps, onDestination?: (destination: CollectedDestination) => void): ToolHandlers {
  return {
    async search_destinations(args) {
      const query = listDestinationsSchema.parse({
        q: str(args.q),
        location: str(args.location),
        minPrice: num(args.minPrice),
        maxPrice: num(args.maxPrice),
        minRating: num(args.minRating),
        limit: Math.min(Math.max(Math.trunc(num(args.limit) ?? MAX_SEARCH_RESULTS), 1), MAX_SEARCH_RESULTS),
        sort: "popular",
      });
      // canSeeInactive = false: chỉ tin APPROVED, đang hoạt động (BR-15).
      const where: Prisma.DestinationWhereInput = {
        ...buildDestinationWhere(query, false),
        ...(str(args.categorySlug) ? { category: { slug: str(args.categorySlug) } } : {}),
      };
      const [data, total] = await deps.findDestinations(query, where, 0, query.limit);
      for (const item of data) onDestination?.({ id: item.id, slug: item.slug, name: item.name });
      return {
        total,
        destinations: data.map((item) => ({
          slug: item.slug,
          name: item.name,
          location: item.location,
          category: item.category?.name ?? null,
          minPrice: item.minPrice,
          averageRating: item.averageRating,
          reviewCount: item.reviewCount,
        })),
      };
    },

    async get_destination(args) {
      const slug = str(args.slug);
      if (!slug) return toolError("VALIDATION_ERROR", "Thiếu slug");
      const destination = await deps.findDestination(slug);
      if (!destination || !destination.isActive || destination.listingStatus !== "APPROVED") {
        return toolError("NOT_FOUND", "Không tìm thấy Địa điểm");
      }
      onDestination?.({ id: destination.id, slug: destination.slug, name: destination.name });
      return { destination: toDestinationForAi(destination) };
    },

    async quote_booking(args) {
      const parsed = quoteBookingSchema.safeParse({ roomsCount: 1, ...args });
      if (!parsed.success) {
        return toolError("VALIDATION_ERROR", parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "));
      }
      const quote = await deps.quoteBooking(parsed.data);
      return {
        destination: { name: quote.destination.name, slug: quote.destination.slug, location: quote.destination.location },
        package: quote.package,
        roomType: quote.roomType,
        services: quote.services,
        voucherCode: quote.voucherCode,
        checkInDate: dateOnly(quote.checkIn),
        checkOutDate: dateOnly(quote.checkOut),
        nights: quote.nights,
        nightlyRoomPrices: quote.nightlyRoomPrices,
        guests: quote.guests,
        roomsCount: quote.roomsCount,
        availableRooms: quote.availableRooms,
        isAvailable: quote.isAvailable,
        price: quote.price,
      };
    },

    async get_policies() {
      return { policies: policiesText() };
    },
  };
}

// Lỗi nghiệp vụ (HttpError) trả về cho AI dưới dạng { error } để nó giải thích cho khách; lỗi khác ném tiếp.
function toExecutor(handlers: ToolHandlers) {
  return async function executeTool(name: string, args: Record<string, unknown> = {}): Promise<ToolResult> {
    const handler = Object.hasOwn(handlers, name) ? handlers[name] : undefined;
    if (!handler) return toolError("UNKNOWN_TOOL", `Tool ${name} không tồn tại`);
    try {
      return await handler(args);
    } catch (error) {
      if (error instanceof HttpError) return toolError(error.code, error.message);
      throw error;
    }
  };
}

// customer: chủ hội thoại. Luôn dùng role USER và phạm vi "mine" để tool booking chỉ thấy booking của khách (BR-10),
// kể cả khi tài khoản đó là OWNER/STAFF (khi đó listBookings mặc định trả booking họ quản lý).
export function createCskhToolExecutor(customer: { id: number }, deps: ToolDeps = defaultToolDeps) {
  const user: AuthUser = { id: customer.id, role: "USER", email: "", name: "" };

  return toExecutor({
    ...publicHandlers(deps),
    async list_my_bookings(args) {
      const query = listBookingsSchema.parse({ scope: "mine", status: str(args.status), limit: 10 });
      const { data, total } = await deps.listBookings(user, query);
      // Lọc lại theo chủ booking phòng khi phạm vi trong service thay đổi.
      const own = data.filter((booking) => booking.userId === customer.id);
      return { total: own.length === data.length ? total : own.length, bookings: own.map(toBookingForAi) };
    },

    async get_my_booking(args) {
      const code = str(args.code)?.toUpperCase();
      if (!code) return toolError("VALIDATION_ERROR", "Thiếu mã booking");
      const id = await deps.findBookingIdByCode(customer.id, code);
      if (!id) return toolError("NOT_FOUND", "Không tìm thấy Booking");
      const booking = await deps.getBooking(user, id);
      if (!booking || booking.userId !== customer.id) return toolError("NOT_FOUND", "Không tìm thấy Booking");
      const cancellation = checkCustomerCancellation(booking, booking.package.freeCancellationHours);
      return {
        booking: {
          ...toBookingForAi(booking),
          freeCancellationHours: booking.package.freeCancellationHours,
          services: booking.services.map((service) => ({ name: service.addonService.name, quantity: service.quantity })),
          voucherCode: booking.voucher?.code ?? null,
        },
        customerCanCancel: cancellation.allowed,
        ...(cancellation.allowed ? {} : { cancelBlockedReason: cancellation.reason }),
      };
    },
  });
}

export type ToolExecutor = ReturnType<typeof createCskhToolExecutor>;

// Trợ lý tư vấn công khai (giai đoạn 2): chỉ 4 tool "tư vấn", không có tool booking hay chuyển nhân viên.
// Gom mọi địa điểm search_destinations / get_destination đã trả (theo thứ tự, không trùng) để trả kèm thẻ.
export function createPublicToolExecutor(deps: ToolDeps = defaultToolDeps) {
  const collected = new Map<number, CollectedDestination>();
  const executeTool: ToolExecutor = toExecutor(
    publicHandlers(deps, (destination) => {
      if (!collected.has(destination.id)) collected.set(destination.id, destination);
    }),
  );
  return { executeTool, collectedDestinations: () => [...collected.values()] };
}
