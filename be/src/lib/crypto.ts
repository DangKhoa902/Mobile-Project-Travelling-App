import { createHash, randomBytes } from "node:crypto";

// Token ngẫu nhiên an toàn để gửi cho client (refresh token, link email).
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

// Chỉ lưu bản băm trong DB: lộ DB cũng không dùng lại được token.
export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
