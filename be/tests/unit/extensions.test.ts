import { describe, expect, it } from "vitest";
import { sha256 } from "../../src/lib/crypto.js";
import { routeKey } from "../../src/middlewares/request-log.js";
import { planGoogleSignIn } from "../../src/services/auth.service.js";
import { toSearchText } from "../../src/lib/search-text.js";
import { detectImageType } from "../../src/lib/storage.js";
import { parseDateOnly } from "../../src/services/booking-rules.js";
import { calculateBookingPrice, nightlyRoomPrices } from "../../src/services/pricing.js";

describe("nightlyRoomPrices", () => {
  const tet = { name: "Tết", startDate: parseDateOnly("2027-02-04"), endDate: parseDateOnly("2027-02-06"), pricePerNight: 800_000 };

  it("đêm trong khoảng giá mùa (gồm cả ngày đầu và cuối) dùng giá mùa, đêm khác dùng giá gốc", () => {
    const nights = nightlyRoomPrices(500_000, [tet], parseDateOnly("2027-02-03"), 5);
    expect(nights.map((night) => night.price)).toEqual([500_000, 800_000, 800_000, 800_000, 500_000]);
    expect(nights.at(1)).toEqual({ date: "2027-02-04", price: 800_000, rateName: "Tết" });
  });

  it("tiền phòng = tổng giá từng đêm × số phòng", () => {
    const nightly = nightlyRoomPrices(500_000, [tet], parseDateOnly("2027-02-05"), 2).map((night) => night.price);
    const price = calculateBookingPrice({
      packagePrice: 0,
      roomPricePerNight: 500_000,
      roomNightlyPrices: nightly,
      nights: 2,
      roomsCount: 2,
      guests: 2,
      services: [],
      taxRate: 0,
    });
    expect(price.roomPrice).toBe((800_000 + 800_000) * 2);
  });

  it("không có giá mùa thì giữ cách tính cũ", () => {
    const price = calculateBookingPrice({ packagePrice: 0, roomPricePerNight: 300_000, nights: 3, roomsCount: 1, guests: 1, services: [], taxRate: 0 });
    expect(price.roomPrice).toBe(900_000);
  });
});

describe("toSearchText", () => {
  it("bỏ dấu, viết thường, gộp khoảng trắng", () => {
    expect(toSearchText("Đà Lạt  Pine Hill", "Lâm Đồng", null)).toBe("da lat pine hill lam dong");
  });

  it("từ khóa không dấu và có dấu cho cùng kết quả", () => {
    expect(toSearchText("ĐÀ LẠT")).toBe(toSearchText("da lat"));
  });
});

describe("detectImageType", () => {
  it("nhận đúng JPEG, PNG, WebP theo chữ ký file", () => {
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(detectImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(detectImageType(Buffer.from("RIFF0000WEBPVP8 ", "ascii"))).toBe("image/webp");
  });

  it("từ chối file không phải ảnh dù đổi đuôi", () => {
    expect(detectImageType(Buffer.from("<?php echo 1; ?>"))).toBeNull();
    expect(detectImageType(Buffer.from("%PDF-1.7"))).toBeNull();
  });
});

describe("sha256", () => {
  it("ổn định và 64 ký tự hex", () => {
    expect(sha256("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

describe("routeKey", () => {
  const key = (originalUrl: string) => routeKey({ originalUrl } as Parameters<typeof routeKey>[0]);

  it("thay đoạn số bằng :id và bỏ query string", () => {
    expect(key("/api/bookings/12/pay?x=1")).toBe("/api/bookings/:id/pay");
    expect(key("/api/room-types/3/rates/7")).toBe("/api/room-types/:id/rates/:id");
  });

  it("giữ slug", () => {
    expect(key("/api/destinations/da-lat-pine-hill-resort")).toBe("/api/destinations/da-lat-pine-hill-resort");
  });
});

describe("planGoogleSignIn", () => {
  const profile = { sub: "g-123", email: "an@gmail.com", emailVerified: true, name: "An", picture: null };

  it("đã liên kết Google thì đăng nhập đúng tài khoản đó", () => {
    expect(planGoogleSignIn({ id: 7, googleId: "g-123" }, { id: 7, googleId: "g-123" }, profile)).toEqual({ kind: "existing", userId: 7 });
  });

  it("email đã đăng ký bằng mật khẩu thì liên kết vào tài khoản cũ", () => {
    expect(planGoogleSignIn(null, { id: 3, googleId: null }, profile)).toEqual({ kind: "link", userId: 3 });
  });

  it("chưa có tài khoản thì tạo mới", () => {
    expect(planGoogleSignIn(null, null, profile)).toEqual({ kind: "create" });
  });

  it("không liên kết khi Google chưa xác minh email (tránh chiếm tài khoản)", () => {
    expect(() => planGoogleSignIn(null, { id: 3, googleId: null }, { ...profile, emailVerified: false })).toThrow(/chưa được xác minh/);
  });

  it("không ghi đè liên kết với tài khoản Google khác", () => {
    expect(() => planGoogleSignIn(null, { id: 3, googleId: "g-999" }, profile)).toThrow(/tài khoản Google khác/);
  });
});
