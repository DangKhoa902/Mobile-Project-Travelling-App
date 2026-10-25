import * as SecureStore from "expo-secure-store";

// Android/iOS: lưu token trong Keychain/Keystore thay vì AsyncStorage dạng plain text.
const KEY = "auth_session";

export type StoredTokens = { accessToken: string; refreshToken: string; sessionId: number };

export const tokenStorage = {
  async get(): Promise<StoredTokens | null> {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredTokens;
    } catch {
      return null;
    }
  },
  set: (tokens: StoredTokens) => SecureStore.setItemAsync(KEY, JSON.stringify(tokens)),
  clear: () => SecureStore.deleteItemAsync(KEY),
};
