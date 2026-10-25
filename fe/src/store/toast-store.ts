import { create } from "zustand";

export type Toast = { id: number; message: string; tone: "success" | "error" | "info"; action?: { label: string; onPress: () => void } };

type ToastState = {
  toasts: Toast[];
  show: (message: string, options?: { tone?: Toast["tone"]; action?: Toast["action"] }) => void;
  dismiss: (id: number) => void;
};

let nextId = 1;

// Thông báo ngắn ở đáy màn hình (Alert của React Native không chạy trên web).
export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  show(message, options) {
    const id = nextId++;
    set({ toasts: [...get().toasts.slice(-2), { id, message, tone: options?.tone ?? "info", action: options?.action }] });
    setTimeout(() => get().dismiss(id), options?.action ? 5000 : 3000);
  },
  dismiss(id) {
    set({ toasts: get().toasts.filter((toast) => toast.id !== id) });
  },
}));

export const toast = {
  success: (message: string, action?: Toast["action"]) => useToastStore.getState().show(message, { tone: "success", action }),
  error: (message: string) => useToastStore.getState().show(message, { tone: "error" }),
  info: (message: string) => useToastStore.getState().show(message, { tone: "info" }),
};
