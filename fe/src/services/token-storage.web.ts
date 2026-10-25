// expo-secure-store không hỗ trợ web; dùng localStorage (có thể bị chặn trong private mode).
const KEY = "auth_session";

export type StoredTokens = { accessToken: string; refreshToken: string; sessionId: number };

export const tokenStorage = {
  async get(): Promise<StoredTokens | null> {
    try {
      const raw = globalThis.localStorage?.getItem(KEY);
      return raw ? (JSON.parse(raw) as StoredTokens) : null;
    } catch {
      return null;
    }
  },
  async set(tokens: StoredTokens) {
    try {
      globalThis.localStorage?.setItem(KEY, JSON.stringify(tokens));
    } catch {}
  },
  async clear() {
    try {
      globalThis.localStorage?.removeItem(KEY);
    } catch {}
  },
};
