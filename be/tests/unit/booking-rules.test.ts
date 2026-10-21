import { describe, expect, it } from "vitest";
import {
  canTransition,
  checkCustomerCancellation,
  generateBookingCode,
  nightsBetween,
  parseDateOnly,
  todayInVietnam,
} from "../../src/services/booking-rules.js";

describe("canTransition", () => {
  it("cho phép luồng PENDING → CONFIRMED → COMPLETED", () => {
    expect(canTransition("PENDING", "CONFIRMED")).toBe(true);
    expect(canTransition("CONFIRMED", "COMPLETED")).toBe(true);
  });

  it("không cho hoàn thành booking chưa xác nhận hoặc mở lại booking đã hủy", () => {
    expect(canTransition("PENDING", "COMPLETED")).toBe(false);
    expect(canTransition("CANCELLED", "PENDING")).toBe(false);
    expect(canTransition("COMPLETED", "CANCELLED")).toBe(false);
  });
});

describe("checkCustomerCancellation", () => {
  const checkInDate = parseDateOnly("2026-12-10");

  it("PENDING được hủy trước giờ nhận phòng", () => {
    const now = new Date("2026-12-10T05:00:00Z"); // 12:00 giờ VN, trước 14:00
    expect(checkCustomerCancellation({ status: "PENDING", checkInDate }, 48, now).allowed).toBe(true);
  });

  it("không ai được hủy sau giờ nhận phòng", () => {
    const now = new Date("2026-12-10T08:00:00Z");
    expect(checkCustomerCancellation({ status: "PENDING", checkInDate }, 48, now).allowed).toBe(false);
  });

  it("CONFIRMED chỉ được hủy khi còn đủ số giờ hủy miễn phí", () => {
    const early = new Date("2026-12-07T07:00:00Z"); // còn 72 giờ
    const late = new Date("2026-12-09T07:00:00Z"); // còn 24 giờ
    expect(checkCustomerCancellation({ status: "CONFIRMED", checkInDate }, 48, early).allowed).toBe(true);
    expect(checkCustomerCancellation({ status: "CONFIRMED", checkInDate }, 48, late).allowed).toBe(false);
  });

  it("không hủy được booking đã hoàn thành", () => {
    const now = new Date("2026-12-01T00:00:00Z");
    expect(checkCustomerCancellation({ status: "COMPLETED", checkInDate }, 48, now).allowed).toBe(false);
  });
});

describe("date helpers", () => {
  it("đếm số đêm", () => {
    expect(nightsBetween(parseDateOnly("2026-12-01"), parseDateOnly("2026-12-04"))).toBe(3);
  });

  it("lấy ngày hiện tại theo giờ Việt Nam", () => {
    // 20:00 UTC ngày 21 = 03:00 sáng ngày 22 ở Việt Nam
    expect(todayInVietnam(new Date("2026-10-21T20:00:00Z")).toISOString()).toBe("2026-10-22T00:00:00.000Z");
  });
});

describe("generateBookingCode", () => {
  it("có định dạng TAyymmdd-XXXXXX", () => {
    expect(generateBookingCode(new Date("2026-10-21T03:00:00Z"))).toMatch(/^TA261021-[A-Z2-9]{6}$/);
  });
});
