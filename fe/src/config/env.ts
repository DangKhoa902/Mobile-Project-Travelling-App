import Constants from "expo-constants";
import { Platform } from "react-native";

const API_PORT = 3000;

// Khi dev bằng Expo Go trên điện thoại thật, "localhost" là chính điện thoại.
// Lấy IP máy chạy Metro (hostUri) để gọi API trên cùng máy đó.
function devFallbackUrl(): string {
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  if (host) return `http://${host}:${API_PORT}/api`;
  // Android Emulator truy cập máy host qua 10.0.2.2.
  if (Platform.OS === "android") return `http://10.0.2.2:${API_PORT}/api`;
  return `http://localhost:${API_PORT}/api`;
}

export const API_URL = process.env.EXPO_PUBLIC_API_URL || devFallbackUrl();
