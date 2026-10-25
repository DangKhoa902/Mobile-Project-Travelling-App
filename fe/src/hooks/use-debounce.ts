import { useEffect, useState } from "react";

// Trả về giá trị sau khi ngừng thay đổi `delay` ms (ô tìm kiếm, báo giá).
export function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
