import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

export function Card({ children, className = "", onPress }: { children: ReactNode; className?: string; onPress?: () => void }) {
  const base = `rounded-2xl border border-line bg-surface-card p-4 ${className}`;
  if (onPress) {
    return (
      <Pressable onPress={onPress} className={`${base} active:opacity-90`}>
        {children}
      </Pressable>
    );
  }
  return <View className={base}>{children}</View>;
}

export function SectionTitle({ title, action, className = "" }: { title: string; action?: ReactNode; className?: string }) {
  return (
    <View className={`flex-row items-center justify-between ${className}`}>
      <Text className="text-lg font-bold text-brand">{title}</Text>
      {action}
    </View>
  );
}

// Dòng "nhãn ........ giá trị" trong hóa đơn, thông tin booking.
export function InfoRow({ label, value, strong, tone }: { label: string; value: ReactNode; strong?: boolean; tone?: "success" | "danger" }) {
  const color = tone === "success" ? "text-brand-light" : tone === "danger" ? "text-danger" : "text-brand";
  return (
    <View className="flex-row items-start justify-between gap-4 py-1">
      <Text className={`flex-1 ${strong ? "font-bold text-brand" : "text-muted"}`}>{label}</Text>
      {typeof value === "string" || typeof value === "number" ? (
        <Text className={`max-w-[60%] text-right ${strong ? "text-lg font-bold" : "font-medium"} ${color}`}>{value}</Text>
      ) : (
        value
      )}
    </View>
  );
}

export function Divider() {
  return <View className="my-2 h-px bg-line" />;
}

// Dải thông báo màu (cảnh báo xác thực email, lý do từ chối...).
export function Banner({ tone = "info", title, children }: { tone?: "info" | "warning" | "danger" | "success"; title?: string; children?: ReactNode }) {
  const styles = {
    info: "bg-info-soft border-info",
    warning: "bg-accent-soft border-accent",
    danger: "bg-danger-soft border-danger",
    success: "bg-brand-soft border-brand-light",
  }[tone];
  return (
    <View className={`gap-1 rounded-xl border-l-4 p-3 ${styles}`}>
      {title ? <Text className="font-semibold text-brand">{title}</Text> : null}
      {typeof children === "string" ? <Text className="text-sm text-brand">{children}</Text> : children}
    </View>
  );
}
