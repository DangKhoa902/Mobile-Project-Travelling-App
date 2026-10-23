import { z } from "zod";
import { phoneSchema } from "./booking.schema.js";

const passwordSchema = z
  .string()
  .min(8, "Mật khẩu tối thiểu 8 ký tự")
  .max(72, "Mật khẩu tối đa 72 ký tự")
  .regex(/[A-Za-z]/, "Mật khẩu phải có chữ cái")
  .regex(/\d/, "Mật khẩu phải có chữ số");

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().trim().toLowerCase(),
  password: passwordSchema,
  phone: phoneSchema.optional(),
  dateOfBirth: z.iso.date().optional(),
  // Bắt buộc theo quy định bảo vệ dữ liệu cá nhân; không lưu vào DB, chỉ kiểm tra lúc đăng ký.
  acceptTerms: z.literal(true, { error: "Cần đồng ý điều khoản sử dụng và chính sách bảo mật" }),
});

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1).max(72),
});

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    phone: phoneSchema.nullable(),
    dateOfBirth: z.iso.date().nullable(),
    avatarUrl: z.url().max(500).nullable(),
  })
  .partial();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(72),
  newPassword: passwordSchema,
});
