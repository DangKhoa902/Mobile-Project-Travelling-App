import { describe, expect, it } from "vitest";
import { calculateBookingPrice, calculateCommission, calculateDiscount, serviceLineTotal } from "../../src/services/pricing.js";

describe("calculateBookingPrice", () => {
  it("cộng giá gói + phòng + dịch vụ, trừ giảm giá, cộng thuế (ví dụ trong tài liệu nghiệp vụ)", () => {
    const price = calculateBookingPrice({
      packagePrice: 2_000_000,
      roomPricePerNight: 500_000,
      nights: 1,
      roomsCount: 1,
      guests: 2,
      services: [
        { id: 1, price: 200_000, pricingUnit: "PER_BOOKING", quantity: 1 },
        { id: 2, price: 300_000, pricingUnit: "PER_BOOKING", quantity: 1 },
      ],
      voucher: { discountType: "FIXED", value: 200_000, maxDiscount: null },
      taxRate: 0,
    });

    expect(price.subtotal).toBe(3_000_000);
    expect(price.discountAmount).toBe(200_000);
    expect(price.totalAmount).toBe(2_800_000);
  });

  it("tính tiền phòng theo số đêm × số phòng và thuế trên số tiền sau giảm giá", () => {
    const price = calculateBookingPrice({
      packagePrice: 1_000_000,
      roomPricePerNight: 400_000,
      nights: 3,
      roomsCount: 2,
      guests: 4,
      services: [],
      voucher: { discountType: "PERCENT", value: 10, maxDiscount: null },
      taxRate: 0.08,
    });

    expect(price.roomPrice).toBe(2_400_000);
    expect(price.subtotal).toBe(3_400_000);
    expect(price.discountAmount).toBe(340_000);
    expect(price.taxAmount).toBe(244_800);
    expect(price.totalAmount).toBe(3_304_800);
  });
});

describe("serviceLineTotal", () => {
  it("nhân theo đơn vị tính", () => {
    expect(serviceLineTotal({ id: 1, price: 100, pricingUnit: "PER_BOOKING", quantity: 2 }, 3, 4)).toBe(200);
    expect(serviceLineTotal({ id: 1, price: 100, pricingUnit: "PER_GUEST", quantity: 1 }, 3, 4)).toBe(300);
    expect(serviceLineTotal({ id: 1, price: 100, pricingUnit: "PER_NIGHT", quantity: 1 }, 3, 4)).toBe(400);
  });
});

describe("calculateDiscount", () => {
  it("giới hạn theo maxDiscount", () => {
    expect(calculateDiscount(5_000_000, { discountType: "PERCENT", value: 10, maxDiscount: 200_000 })).toBe(200_000);
  });

  it("không giảm quá tạm tính", () => {
    expect(calculateDiscount(100_000, { discountType: "FIXED", value: 500_000, maxDiscount: null })).toBe(100_000);
  });

  it("trả 0 khi không có voucher", () => {
    expect(calculateDiscount(100_000, null)).toBe(0);
  });
});

describe("calculateCommission", () => {
  it("tính hoa hồng trên (tạm tính - giảm giá), phần còn lại là doanh thu chủ địa điểm", () => {
    expect(calculateCommission(3_000_000, 200_000, 0.15)).toEqual({
      commissionRate: 0.15,
      commissionAmount: 420_000,
      ownerRevenue: 2_380_000,
    });
  });

  it("địa điểm của sàn (tỷ lệ 1) thì sàn giữ toàn bộ", () => {
    expect(calculateCommission(1_000_000, 0, 1).ownerRevenue).toBe(0);
  });
});
