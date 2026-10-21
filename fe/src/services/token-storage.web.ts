// expo-secure-store không hỗ trợ web; dùng localStorage (có thể bị chặn trong private mode).
const TOKEN_KEY = "auth_token";

export const tokenStorage = {
  async get() {
    try {
      return globalThis.localStorage?.getItem(TOKEN_KEY) ?? null;
    } catch {
      return null;
    }
  },
  async set(token: string) {
    try {
      globalThis.localStorage?.setItem(TOKEN_KEY, token);
    } catch {}
  },
  async clear() {
    try {
      globalThis.localStorage?.removeItem(TOKEN_KEY);
    } catch {}
  },
};
