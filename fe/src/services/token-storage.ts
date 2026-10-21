import * as SecureStore from "expo-secure-store";

// Android/iOS: lưu token trong Keychain/Keystore thay vì AsyncStorage dạng plain text.
const TOKEN_KEY = "auth_token";

export const tokenStorage = {
  get: () => SecureStore.getItemAsync(TOKEN_KEY),
  set: (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token),
  clear: () => SecureStore.deleteItemAsync(TOKEN_KEY),
};
