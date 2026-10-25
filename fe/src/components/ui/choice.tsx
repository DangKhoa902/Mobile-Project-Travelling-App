import Ionicons from "@expo/vector-icons/Ionicons";
import type { ReactNode } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";

import { Colors } from "@/constants/theme";

export function Chip({ label, active, onPress, icon }: { label: string; active?: boolean; onPress?: () => void; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={`min-h-9 flex-row items-center gap-1 rounded-full border px-4 py-2 active:opacity-80 ${active ? "border-brand bg-brand" : "border-line bg-surface-card"}`}>
      {icon ? <Ionicons name={icon} size={14} color={active ? Colors.white : Colors.brand} /> : null}
      <Text className={`text-sm font-medium ${active ? "text-white" : "text-brand"}`}>{label}</Text>
    </Pressable>
  );
}

// Hàng chip cuộn ngang (danh mục, bộ lọc trạng thái).
export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 py-1">
      {children}
    </ScrollView>
  );
}

export function Checkbox({ checked, onChange, label, children }: { checked: boolean; onChange: (value: boolean) => void; label?: string; children?: ReactNode }) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      className="min-h-11 flex-row items-center gap-3 active:opacity-80">
      <View className={`h-6 w-6 items-center justify-center rounded-md border-2 ${checked ? "border-brand bg-brand" : "border-muted bg-surface-card"}`}>
        {checked ? <Ionicons name="checkmark" size={16} color={Colors.white} /> : null}
      </View>
      <View className="flex-1">{label ? <Text className="text-base text-brand">{label}</Text> : children}</View>
    </Pressable>
  );
}

// Thẻ chọn một (gói, loại phòng, phương thức thanh toán).
export function RadioCard({
  selected,
  onPress,
  disabled,
  children,
}: {
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      className={`flex-row gap-3 rounded-2xl border-2 bg-surface-card p-4 ${selected ? "border-brand" : "border-line"} ${disabled ? "opacity-40" : "active:opacity-90"}`}>
      <View className={`mt-0.5 h-5 w-5 items-center justify-center rounded-full border-2 ${selected ? "border-brand" : "border-muted"}`}>
        {selected ? <View className="h-2.5 w-2.5 rounded-full bg-brand" /> : null}
      </View>
      <View className="flex-1">{children}</View>
    </Pressable>
  );
}

// Tab con (Sắp tới / Hoàn thành / Đã hủy...).
export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string; count?: number }[]; onChange: (value: T) => void }) {
  return (
    <View className="flex-row rounded-xl bg-brand-soft p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className={`min-h-10 flex-1 flex-row items-center justify-center gap-1 rounded-lg px-2 ${active ? "bg-surface-card" : ""}`}>
            <Text className={`text-sm font-semibold ${active ? "text-brand" : "text-muted"}`} numberOfLines={1}>
              {option.label}
            </Text>
            {option.count ? (
              <View className="rounded-full bg-danger px-1.5">
                <Text className="text-xs font-bold text-white">{option.count}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

// Bộ đếm +/− (số khách, số phòng, số lượng dịch vụ).
export function Stepper({ value, min = 0, max = 99, onChange, label }: { value: number; min?: number; max?: number; onChange: (value: number) => void; label?: string }) {
  return (
    <View className="flex-row items-center gap-3">
      {label ? <Text className="flex-1 text-base text-brand">{label}</Text> : null}
      <Pressable
        onPress={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        accessibilityLabel={`Giảm ${label ?? ""}`}
        className={`h-10 w-10 items-center justify-center rounded-full border border-line bg-surface-card ${value <= min ? "opacity-40" : "active:opacity-70"}`}>
        <Ionicons name="remove" size={20} color={Colors.brand} />
      </Pressable>
      <Text className="min-w-8 text-center text-lg font-bold text-brand">{value}</Text>
      <Pressable
        onPress={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        accessibilityLabel={`Tăng ${label ?? ""}`}
        className={`h-10 w-10 items-center justify-center rounded-full border border-line bg-surface-card ${value >= max ? "opacity-40" : "active:opacity-70"}`}>
        <Ionicons name="add" size={20} color={Colors.brand} />
      </Pressable>
    </View>
  );
}

export function Toggle({ value, onChange, label, disabled }: { value: boolean; onChange: (value: boolean) => void; label?: string; disabled?: boolean }) {
  return (
    <View className="min-h-11 flex-row items-center gap-3">
      {label ? <Text className="flex-1 text-base text-brand">{label}</Text> : null}
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: Colors.brandLight, false: Colors.line }}
        thumbColor={Colors.white}
        accessibilityLabel={label}
      />
    </View>
  );
}

export function Stars({ value, size = 14, onChange }: { value: number; size?: number; onChange?: (value: number) => void }) {
  return (
    <View className="flex-row gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const icon = value >= star ? "star" : value >= star - 0.5 ? "star-half" : "star-outline";
        return onChange ? (
          <Pressable key={star} onPress={() => onChange(star)} accessibilityLabel={`${star} sao`} hitSlop={4} className="p-1">
            <Ionicons name={icon} size={size} color={Colors.accent} />
          </Pressable>
        ) : (
          <Ionicons key={star} name={icon} size={size} color={Colors.accent} />
        );
      })}
    </View>
  );
}
