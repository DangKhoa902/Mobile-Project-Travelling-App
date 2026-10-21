import bcrypt from "bcryptjs";
import type { z } from "zod";
import { userDao } from "../dao/user.dao.js";
import { badRequest, conflict, forbidden, HttpError, notFound } from "../lib/http-error.js";
import { signAccessToken } from "../middlewares/auth.js";
import { parseDateOnly } from "./booking-rules.js";
import type { changePasswordSchema, loginSchema, registerSchema, updateProfileSchema } from "../validators/auth.schema.js";

const BCRYPT_ROUNDS = 10;

export async function register(input: z.infer<typeof registerSchema>) {
  if (await userDao.findByEmail(input.email)) throw conflict("Email đã được sử dụng", "EMAIL_TAKEN");

  const user = await userDao.create({
    name: input.name,
    email: input.email,
    password: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
    phone: input.phone,
    dateOfBirth: input.dateOfBirth ? parseDateOnly(input.dateOfBirth) : undefined,
  });
  return { user, token: signAccessToken(user) };
}

export async function login(input: z.infer<typeof loginSchema>) {
  const record = await userDao.findCredentialsByEmail(input.email);
  // Cùng một thông báo cho sai email hoặc sai mật khẩu để không lộ email nào đã đăng ký.
  if (!record || !(await bcrypt.compare(input.password, record.password))) {
    throw new HttpError(401, "Email hoặc mật khẩu không đúng", "INVALID_CREDENTIALS");
  }
  if (record.status === "LOCKED") throw forbidden("Tài khoản đã bị khóa");

  const { password: _password, ...user } = record;
  return { user, token: signAccessToken(user) };
}

export async function getProfile(userId: number) {
  const user = await userDao.findById(userId);
  if (!user) throw notFound("User");
  return user;
}

export function updateProfile(userId: number, input: z.infer<typeof updateProfileSchema>) {
  return userDao.update(userId, {
    ...input,
    dateOfBirth: input.dateOfBirth === undefined ? undefined : input.dateOfBirth && parseDateOnly(input.dateOfBirth),
  });
}

export async function changePassword(userId: number, input: z.infer<typeof changePasswordSchema>) {
  const record = await userDao.findCredentialsById(userId);
  if (!record) throw notFound("User");
  if (!(await bcrypt.compare(input.currentPassword, record.password))) {
    throw badRequest("Mật khẩu hiện tại không đúng", "INVALID_PASSWORD");
  }
  await userDao.update(userId, { password: await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS) });
}
