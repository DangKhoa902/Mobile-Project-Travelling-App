import Ionicons from "@expo/vector-icons/Ionicons";
import { ActivityIndicator, Pressable, Text } from "react-native";

import { Colors } from "@/constants/theme";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";

const container: Record<Variant, string> = {
  primary: "bg-brand",
  secondary: "bg-brand-soft",
  outline: "border border-line bg-surface-card",
  ghost: "bg-transparent",
  danger: "bg-danger",
};

const label: Record<Variant, string> = {
  primary: "text-white",
  secondary: "text-brand",
  outline: "text-brand",
  ghost: "text-brand-light",
  danger: "text-white",
};

const iconColor: Record<Variant, string> = {
  primary: Colors.white,
  secondary: Colors.brand,
  outline: Colors.brand,
  ghost: Colors.brandLight,
  danger: Colors.white,
};

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: "sm" | "md";
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  full?: boolean;
  className?: string;
};

// Nút chuẩn ≥ 44px chiều cao; `loading` khóa nút để không bấm hai lần (ví dụ tạo hai booking).
export function Button({ title, onPress, variant = "primary", size = "md", icon, loading, disabled, full, className = "" }: ButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      className={`flex-row items-center justify-center gap-2 rounded-xl ${size === "sm" ? "min-h-9 px-3" : "min-h-12 px-5"} ${container[variant]} ${full ? "w-full" : ""} ${inactive ? "opacity-50" : "active:opacity-80"} ${className}`}>
      {loading ? (
        <ActivityIndicator size="small" color={iconColor[variant]} />
      ) : icon ? (
        <Ionicons name={icon} size={size === "sm" ? 16 : 18} color={iconColor[variant]} />
      ) : null}
      <Text className={`font-semibold ${size === "sm" ? "text-sm" : "text-base"} ${label[variant]}`}>{title}</Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  label: accessibilityLabel,
  color = Colors.brand,
  className = "",
  size = 22,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  label: string;
  color?: string;
  className?: string;
  size?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      className={`h-11 w-11 items-center justify-center rounded-full active:opacity-70 ${className}`}>
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}
