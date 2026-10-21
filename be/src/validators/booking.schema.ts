import { z } from "zod";
import { paginationSchema } from "../lib/pagination.js";

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(\+?84|0)\d{9,10}$/, "Số điện thoại không hợp lệ");

export const quoteBookingSchema = z.object({
  packageId: z.number().int().positive(),
  roomTypeId: z.number().int().positive(),
  checkInDate: z.iso.date(),
  checkOutDate: z.iso.date(),
  guests: z.number().int().min(1).max(50),
  roomsCount: z.number().int().min(1).max(20),
  services: z
    .array(
      z.object({
        addonServiceId: z.number().int().positive(),
        quantity: z.number().int().min(1).max(20).default(1),
      }),
    )
    .max(20)
    .default([]),
  voucherCode: z.string().trim().toUpperCase().min(1).max(50).optional(),
});

export const createBookingSchema = quoteBookingSchema.extend({
  contactName: z.string().trim().min(2).max(100),
  contactPhone: phoneSchema,
  contactEmail: z.email(),
  note: z.string().trim().max(1000).optional(),
  paymentMethod: z.enum(["ONLINE_MOCK", "PAY_AT_PROPERTY"]).default("ONLINE_MOCK"),
});

export const listBookingsSchema = paginationSchema.extend({
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"]).optional(),
  code: z.string().trim().optional(),
});

export const cancelBookingSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const updateBookingStatusSchema = z.object({
  status: z.enum(["CONFIRMED", "COMPLETED"]),
});

export const payBookingSchema = z.object({
  // Cho phép mô phỏng thanh toán thất bại khi demo.
  simulateFailure: z.boolean().default(false),
});

export const availabilitySchema = z.object({
  roomTypeId: z.coerce.number().int().positive(),
  checkInDate: z.iso.date(),
  checkOutDate: z.iso.date(),
});

export type QuoteBookingInput = z.infer<typeof quoteBookingSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type ListBookingsInput = z.infer<typeof listBookingsSchema>;
