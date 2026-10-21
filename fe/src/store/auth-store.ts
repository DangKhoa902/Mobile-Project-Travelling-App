import { create } from "zustand";

import { setAuthToken, setUnauthorizedHandler } from "@/services/api/client";
import { tokenStorage } from "@/services/token-storage";
import { authService } from "@/services/travel.service";
import type { User } from "@/types/api";

type AuthState = {
  user: User | null;
  token: string | null;
  // "loading" khi đang đọc token đã lưu lúc mở app.
  status: "loading" | "authenticated" | "guest";
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  status: "loading",

  async hydrate() {
    const token = await tokenStorage.get();
    if (!token) {
      set({ status: "guest" });
      return;
    }
    setAuthToken(token);
    try {
      const user = await authService.me();
      set({ user, token, status: "authenticated" });
    } catch {
      await get().logout();
    }
  },

  async login(email, password) {
    const { user, token } = await authService.login(email, password);
    setAuthToken(token);
    await tokenStorage.set(token);
    set({ user, token, status: "authenticated" });
  },

  async logout() {
    setAuthToken(null);
    await tokenStorage.clear();
    set({ user: null, token: null, status: "guest" });
  },
}));

// Token hết hạn hoặc tài khoản bị khóa: tự đăng xuất.
setUnauthorizedHandler(() => void useAuthStore.getState().logout());
