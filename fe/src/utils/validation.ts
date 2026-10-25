// Kiểm tra trên giao diện, giống quy tắc backend (be/src/validators). Backend vẫn kiểm tra lại.

export const PHONE_RE = /^(\+?84|0)\d{9,10}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mật khẩu: 8–72 ký tự, có chữ và số.
export function passwordProblem(value: string): string | undefined {
  if (value.length < 8) return "Mật khẩu tối thiểu 8 ký tự";
  if (value.length > 72) return "Mật khẩu tối đa 72 ký tự";
  if (!/[A-Za-z]/.test(value)) return "Mật khẩu phải có chữ cái";
  if (!/\d/.test(value)) return "Mật khẩu phải có chữ số";
  return undefined;
}

// Chỉ chấp nhận đường dẫn nội bộ cho ?redirect= để tránh chuyển hướng ra trang ngoài.
export function safeRedirect(value: string | undefined): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}
