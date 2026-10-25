import { useWindowDimensions } from "react-native";

// Cùng mốc với tailwind.config.js: md = 768px (tablet), lg = 1024px (web có sidebar).
export function useBreakpoint() {
  const { width } = useWindowDimensions();
  return { width, isMd: width >= 768, isLg: width >= 1024 };
}
