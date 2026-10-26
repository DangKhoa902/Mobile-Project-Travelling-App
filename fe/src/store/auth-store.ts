import { create } from "zustand";

import { ApiError, markAuthReady, refreshAccessToken, setAccessToken, setRefreshHandler } from "@/services/api/client";
import { authService, type RegisterInput } from "@/services/auth.service";
import { registerPushDevice, unregisterPushDevice } from "@/services/push";
import { queryClient } from "@/services/query-client";
import { tokenStorage } from "@/services/token-storage";
import type { Session, User } from "@/types/api";

type AuthState = {
  user: User | null;
  sessionId: number | null;
  // "loading" khi đang khôi phục phiên lúc mở app.
  status: "loading" | "authenticated" | "guest";
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  // Trả true nếu vừa tạo tài khoản mới.
  loginWithGoogle: (idToken: string) => Promise<boolean>;
  register: (input: RegisterInput) => Promise<Session>;
  applySession: (session: Session) => Promise<void>;
  refresh: () => Promise<string | null>;
  reloadUser: () => Promise<User | null>;
  setUser: (user: User) => void;
  logout: () => Promise<void>;
};

async function saveSession(session: Session) {
  setAccessToken(session.accessToken);
  await tokenStorage.set({ accessToken: session.accessToken, refreshToken: session.refreshToken, sessionId: session.sessionId });
}

async function clearLocal() {
  setAccessToken(null);
  await tokenStorage.clear();
  queryClient.clear();
}

let hydrating: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  sessionId: null,
  status: "loading",

  // Mở app: có refresh token → làm mới → lấy hồ sơ. Lỗi → về khách.
  // Chạy một lần (effect có thể chạy hai lần ở chế độ dev); xong thì mở cổng cho các request khác.
  hydrate() {
    hydrating ??= (async () => {
      try {
        const stored = await tokenStorage.get();
        if (!stored?.refreshToken) {
          set({ status: "guest" });
          return;
        }
        setAccessToken(stored.accessToken);
        const token = await refreshAccessToken();
        if (!token) {
          set({ status: "guest", user: null });
          return;
        }
        markAuthReady(); // đã có access token mới: /auth/me và các request đang chờ được đi tiếp
        try {
          const user = await authService.me();
          set({ user, status: "authenticated" });
          void registerPushDevice();
        } catch {
          await clearLocal();
          set({ status: "guest", user: null, sessionId: null });
        }
      } finally {
        markAuthReady();
      }
    })();
    return hydrating;
  },

  async login(email, password) {
    const session = await authService.login(email, password);
    await get().applySession(session);
    return session.user!;
  },

  async loginWithGoogle(idToken) {
    const session = await authService.google(idToken);
    await get().applySession(session);
    return session.isNewUser;
  },

  async register(input) {
    const session = await authService.register(input);
    await get().applySession(session);
    return session;
  },

  // Dùng chung cho đăng nhập, đăng ký, đổi mật khẩu (backend trả phiên mới).
  async applySession(session) {
    await saveSession(session);
    set({ sessionId: session.sessionId, status: "authenticated", ...(session.user ? { user: session.user } : {}) });
    if (!session.user) set({ user: await authService.me() });
    void registerPushDevice();
  },

  // Không gọi trực tiếp: đi qua refreshAccessToken() để chỉ làm mới một lần cùng lúc.
  async refresh() {
    const stored = await tokenStorage.get();
    if (!stored?.refreshToken) return null;
    try {
      const session = await authService.refresh(stored.refreshToken);
      await saveSession(session);
      set({ sessionId: session.sessionId, ...(session.user ? { user: session.user } : {}) });
      return session.accessToken;
    } catch (error) {
      // Tab/màn khác vừa làm mới trước: dùng cặp token mới nhất đã lưu, không đăng xuất.
      if (error instanceof ApiError && error.code === "REFRESH_TOKEN_ROTATED") {
        const latest = await tokenStorage.get();
        if (latest && latest.refreshToken !== stored.refreshToken) {
          setAccessToken(latest.accessToken);
          return latest.accessToken;
        }
      }
      if (error instanceof ApiError && error.status === 0) return stored.accessToken; // mất mạng: giữ phiên
      await clearLocal();
      set({ user: null, sessionId: null, status: "guest" });
      return null;
    }
  },

  async reloadUser() {
    try {
      const user = await authService.me();
      set({ user });
      return user;
    } catch {
      return null;
    }
  },

  setUser(user) {
    set({ user });
  },

  async logout() {
    const stored = await tokenStorage.get();
    await unregisterPushDevice();
    if (stored?.refreshToken) {
      try {
        await authService.logout(stored.refreshToken);
      } catch {}
    }
    await clearLocal();
    set({ user: null, sessionId: null, status: "guest" });
  },
}));

setRefreshHandler(() => useAuthStore.getState().refresh());
