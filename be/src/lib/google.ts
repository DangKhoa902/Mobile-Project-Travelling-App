import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env.js";
import { HttpError } from "./http-error.js";

export type GoogleProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture: string | null;
};

// Client ID của app (web, Android, iOS): token phải được cấp cho một trong các ID này.
export const googleClientIds = (env.GOOGLE_CLIENT_IDS ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

const client = new OAuth2Client();

// Xác minh ID token Google (chữ ký, hạn dùng, audience = client ID của app) rồi lấy thông tin tài khoản.
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  if (googleClientIds.length === 0) {
    throw new HttpError(503, "Đăng nhập bằng Google chưa được bật trên máy chủ", "GOOGLE_DISABLED");
  }
  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: googleClientIds });
    payload = ticket.getPayload();
  } catch {
    payload = undefined;
  }
  if (!payload?.sub || !payload.email) {
    throw new HttpError(401, "Không xác minh được tài khoản Google, vui lòng thử lại", "INVALID_GOOGLE_TOKEN");
  }
  return {
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    emailVerified: payload.email_verified === true,
    name: payload.name?.trim() || payload.email.split("@")[0],
    picture: payload.picture ?? null,
  };
}
