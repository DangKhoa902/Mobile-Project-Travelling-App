import { useEffect, useState } from "react";

// Số giây còn lại tới `deadline` (ISO), cập nhật mỗi giây; null nếu không có hạn.
export function useCountdown(deadline: string | null | undefined): number | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!deadline) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  return deadline ? Math.max(0, Math.floor((Date.parse(deadline) - now) / 1000)) : null;
}

export function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
