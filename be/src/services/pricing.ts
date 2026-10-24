import type { DiscountType, ServicePricingUnit } from "../generated/prisma/enums.js";

export type PricedService = {
  id: number;
  price: number;
  pricingUnit: ServicePricingUnit;
  quantity: number;
};

export type PricedVoucher = {
  discountType: DiscountType;
  value: number;
  maxDiscount: number | null;
};

export type SeasonalRate = { name: string; startDate: Date; endDate: Date; pricePerNight: number };

const DAY_MS = 24 * 60 * 60 * 1000;

// Giá từng đêm: đêm d dùng giá mùa nếu startDate ≤ d ≤ endDate (gồm cả hai ngày), ngược lại dùng giá gốc.
// Các khoảng giá mùa của một loại phòng không chồng nhau (kiểm tra lúc tạo), nên mỗi đêm khớp tối đa một khoảng.
export function nightlyRoomPrices(basePrice: number, rates: SeasonalRate[], checkIn: Date, nights: number) {
  return Array.from({ length: nights }, (_, index) => {
    const night = new Date(checkIn.getTime() + index * DAY_MS);
    const rate = rates.find((item) => item.startDate <= night && night <= item.endDate);
    return {
      date: night.toISOString().slice(0, 10),
      price: rate ? rate.pricePerNight : basePrice,
      rateName: rate?.name ?? null,
    };
  });
}

export type PricingInput = {
  packagePrice: number;
  roomPricePerNight: number;
  // Có giá mùa thì truyền giá từng đêm; bỏ trống = mọi đêm dùng roomPricePerNight.
  roomNightlyPrices?: number[];
  nights: number;
  roomsCount: number;
  guests: number;
  services: PricedService[];
  voucher?: PricedVoucher | null;
  taxRate: number;
};

export type PriceBreakdown = {
  packagePrice: number;
  roomPrice: number;
  servicesPrice: number;
  services: { addonServiceId: number; quantity: number; unitPrice: number; totalPrice: number }[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
};

export function serviceLineTotal(service: PricedService, guests: number, nights: number): number {
  const multiplier =
    service.pricingUnit === "PER_GUEST" ? guests : service.pricingUnit === "PER_NIGHT" ? nights : 1;
  return service.price * multiplier * service.quantity;
}

export function calculateDiscount(subtotal: number, voucher: PricedVoucher | null | undefined): number {
  if (!voucher) return 0;
  const raw = voucher.discountType === "PERCENT" ? Math.round((subtotal * voucher.value) / 100) : voucher.value;
  const capped = voucher.maxDiscount != null ? Math.min(raw, voucher.maxDiscount) : raw;
  return Math.max(0, Math.min(capped, subtotal));
}

// Mô hình môi giới: sàn giữ hoa hồng, phần còn lại là doanh thu của chủ địa điểm.
// Tính trên (tạm tính - giảm giá); thuế/phí do sàn thu hộ nên không chia.
// Voucher là khuyến mãi của sàn nhưng vẫn trừ vào cơ sở tính để hai bên cùng chịu theo tỷ lệ.
export function calculateCommission(subtotal: number, discountAmount: number, commissionRate: number) {
  const base = Math.max(0, subtotal - discountAmount);
  const commissionAmount = Math.round(base * commissionRate);
  return { commissionRate, commissionAmount, ownerRevenue: base - commissionAmount };
}

// Tổng tiền = Giá gói + Giá phòng + Dịch vụ bổ sung - Giảm giá + Thuế/phí
export function calculateBookingPrice(input: PricingInput): PriceBreakdown {
  const perRoom = input.roomNightlyPrices
    ? input.roomNightlyPrices.reduce((sum, price) => sum + price, 0)
    : input.roomPricePerNight * input.nights;
  const roomPrice = perRoom * input.roomsCount;
  const services = input.services.map((service) => ({
    addonServiceId: service.id,
    quantity: service.quantity,
    unitPrice: service.price,
    totalPrice: serviceLineTotal(service, input.guests, input.nights),
  }));
  const servicesPrice = services.reduce((sum, line) => sum + line.totalPrice, 0);
  const subtotal = input.packagePrice + roomPrice + servicesPrice;
  const discountAmount = calculateDiscount(subtotal, input.voucher);
  const taxAmount = Math.round((subtotal - discountAmount) * input.taxRate);

  return {
    packagePrice: input.packagePrice,
    roomPrice,
    servicesPrice,
    services,
    subtotal,
    discountAmount,
    taxAmount,
    totalAmount: subtotal - discountAmount + taxAmount,
  };
}
