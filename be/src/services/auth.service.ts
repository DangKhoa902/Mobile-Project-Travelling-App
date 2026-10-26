import bcrypt from "bcryptjs";
import type { z } from "zod";
import { userDao } from "../dao/user.dao.js";
import { randomToken } from "../lib/crypto.js";
import { verifyGoogleIdToken, type GoogleProfile } from "../lib/google.js";
import { badRequest, conflict, forbidden, HttpError, notFound } from "../lib/http-error.js";
import { parseDateOnly } from "./booking-rules.js";
import { exposeDevTokens } from "./mail.service.js";
import { issueSession, revokeAllSessions, type SessionMeta } from "./session.service.js";
import { consumeToken, sendPasswordResetEmail, sendVerificationEmail } from "./verification.service.js";
import type {
  changePasswordSchema,
  googleLoginSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from "../validators/auth.schema.js";

const BCRYPT_ROUNDS = 10;

export async function register(input: z.infer<typeof registerSchema>, meta: SessionMeta) {
  if (await userDao.findByEmail(input.email)) throw conflict("Email đã được sử dụng", "EMAIL_TAKEN");

  const user = await userDao.create({
    name: input.name,
    email: input.email,
    password: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
    phone: input.phone,
    dateOfBirth: input.dateOfBirth ? parseDateOnly(input.dateOfBirth) : undefined,
  });
  const verificationToken = await sendVerificationEmail(user);
  const session = await issueSession(user, meta);
  return { user, ...session, ...(exposeDevTokens() ? { devVerificationToken: verificationToken } : {}) };
}

export async function login(input: z.infer<typeof loginSchema>, meta: SessionMeta) {
  const record = await userDao.findCredentialsByEmail(input.email);
  // Cùng một thông báo cho sai email hoặc sai mật khẩu để không lộ email nào đã đăng ký.
  if (!record || !(await bcrypt.compare(input.password, record.password))) {
    throw new HttpError(401, "Email hoặc mật khẩu không đúng", "INVALID_CREDENTIALS");
  }
  if (record.status === "LOCKED") throw forbidden("Tài khoản đã bị khóa");

  const { password: _password, ...user } = record;
  return { user, ...(await issueSession(user, { ...meta, deviceName: input.deviceName ?? meta.deviceName })) };
}

type GoogleCandidate = { id: number; googleId: string | null } | null;

// Quyết định khi đăng nhập Google (tách riêng để kiểm thử, không đụng DB):
// - đã liên kết "sub" → đăng nhập tài khoản đó;
// - email đã có tài khoản → liên kết, chỉ khi Google xác nhận email (tránh chiếm tài khoản người khác);
// - chưa có → tạo tài khoản mới, email coi như đã xác thực.
export function planGoogleSignIn(byGoogle: GoogleCandidate, byEmail: GoogleCandidate, profile: GoogleProfile) {
  if (byGoogle) return { kind: "existing" as const, userId: byGoogle.id };
  if (!profile.emailVerified) {
    throw conflict("Email Google của bạn chưa được xác minh, hãy dùng email và mật khẩu", "GOOGLE_EMAIL_UNVERIFIED");
  }
  if (byEmail) {
    if (byEmail.googleId && byEmail.googleId !== profile.sub) {
      throw conflict("Email này đã liên kết với một tài khoản Google khác", "GOOGLE_ACCOUNT_MISMATCH");
    }
    return { kind: "link" as const, userId: byEmail.id };
  }
  return { kind: "create" as const };
}

// Đăng nhập / đăng ký bằng Google: xác minh ID token rồi trả phiên giống đăng nhập thường.
export async function googleSignIn(input: z.infer<typeof googleLoginSchema>, meta: SessionMeta) {
  const profile = await verifyGoogleIdToken(input.idToken);
  const [byGoogle, byEmail] = await userDao.findForGoogle(profile.sub, profile.email);
  const plan = planGoogleSignIn(byGoogle, byEmail, profile);

  let user;
  if (plan.kind === "existing") {
    user = byGoogle!;
  } else if (plan.kind === "link") {
    user = await userDao.update(plan.userId, {
      googleId: profile.sub,
      emailVerifiedAt: byEmail!.emailVerifiedAt ?? new Date(),
      avatarUrl: byEmail!.avatarUrl ?? profile.picture,
    });
  } else {
    user = await userDao.create({
      name: profile.name.slice(0, 100),
      email: profile.email,
      googleId: profile.sub,
      // Mật khẩu ngẫu nhiên không ai biết: muốn đăng nhập bằng mật khẩu thì dùng "Quên mật khẩu" để đặt.
      password: await bcrypt.hash(randomToken(32), BCRYPT_ROUNDS),
      emailVerifiedAt: new Date(),
      avatarUrl: profile.picture,
    });
  }
  if (user.status === "LOCKED") throw forbidden("Tài khoản đã bị khóa");

  const { googleId: _googleId, ...publicUser } = user as typeof user & { googleId?: string | null };
  const session = await issueSession(publicUser, { ...meta, deviceName: input.deviceName ?? meta.deviceName });
  return { user: publicUser, ...session, isNewUser: plan.kind === "create" };
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

// Đổi mật khẩu thì đăng xuất mọi thiết bị khác; thiết bị hiện tại nhận phiên mới.
export async function changePassword(userId: number, input: z.infer<typeof changePasswordSchema>, meta: SessionMeta) {
  const record = await userDao.findCredentialsById(userId);
  if (!record) throw notFound("User");
  if (!(await bcrypt.compare(input.currentPassword, record.password))) {
    throw badRequest("Mật khẩu hiện tại không đúng", "INVALID_PASSWORD");
  }
  const user = await userDao.update(userId, { password: await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS) });
  await revokeAllSessions(userId);
  return issueSession(user, meta);
}

export async function verifyEmail(token: string) {
  const userId = await consumeToken(token, "EMAIL_VERIFY");
  return userDao.update(userId, { emailVerifiedAt: new Date() });
}

export async function resendVerification(userId: number) {
  const user = await userDao.findById(userId);
  if (!user) throw notFound("User");
  if (user.emailVerifiedAt) throw conflict("Email đã được xác thực", "ALREADY_VERIFIED");
  const token = await sendVerificationEmail(user);
  return exposeDevTokens() ? { devVerificationToken: token } : {};
}

// Luôn trả cùng một kết quả, có email hay không, để không dò được email đã đăng ký.
export async function forgotPassword(email: string) {
  const user = await userDao.findByEmail(email);
  const message = "Nếu email đã đăng ký, bạn sẽ nhận được link đặt lại mật khẩu trong vài phút.";
  if (!user || user.status === "LOCKED") return { message };
  const token = await sendPasswordResetEmail(user);
  return { message, ...(exposeDevTokens() ? { devResetToken: token } : {}) };
}

export async function resetPassword(input: z.infer<typeof resetPasswordSchema>) {
  const userId = await consumeToken(input.token, "PASSWORD_RESET");
  await userDao.update(userId, {
    password: await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS),
    // Mở được link trong hộp thư = đã chứng minh sở hữu email.
    emailVerifiedAt: new Date(),
  });
  await revokeAllSessions(userId);
}
