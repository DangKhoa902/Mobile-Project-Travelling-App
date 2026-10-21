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

export type PricingInput = {
  packagePrice: number;
  roomPricePerNight: number;
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

// Tổng tiền = Giá gói + Giá phòng + Dịch vụ bổ sung - Giảm giá + Thuế/phí
export function calculateBookingPrice(input: PricingInput): PriceBreakdown {
  const roomPrice = input.roomPricePerNight * input.nights * input.roomsCount;
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
