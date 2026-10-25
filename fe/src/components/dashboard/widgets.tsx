import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Chip } from "@/components/ui/choice";
import { Colors } from "@/constants/theme";
import { addDays, formatDate, formatShortVnd, todayIso } from "@/utils/format";

export function StatCard({ label, value, hint, icon, tone = "brand" }: { label: string; value: string; hint?: string; icon?: keyof typeof Ionicons.glyphMap; tone?: "brand" | "accent" | "danger" }) {
  const color = tone === "accent" ? Colors.accent : tone === "danger" ? Colors.danger : Colors.brandLight;
  return (
    <View className="min-w-[46%] flex-1 gap-1 rounded-2xl border border-line bg-surface-card p-4 lg:min-w-[22%]">
      <View className="flex-row items-center gap-2">
        {icon ? <Ionicons name={icon} size={16} color={color} /> : null}
        <Text className="flex-1 text-xs font-medium text-muted" numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text className="text-xl font-bold text-brand" numberOfLines={1}>
        {value}
      </Text>
      {hint ? <Text className="text-xs text-muted">{hint}</Text> : null}
    </View>
  );
}

// Thẻ "việc cần xử lý" dẫn tới trang xử lý.
export function TodoCard({ label, count, onPress, icon }: { label: string; count: number; onPress: () => void; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <Pressable onPress={onPress} className="min-w-[46%] flex-1 flex-row items-center gap-3 rounded-2xl border border-line bg-surface-card p-4 active:opacity-80 lg:min-w-[18%]">
      <View className={`h-10 w-10 items-center justify-center rounded-full ${count > 0 ? "bg-accent-soft" : "bg-brand-soft"}`}>
        <Ionicons name={icon} size={20} color={count > 0 ? Colors.accent : Colors.brandLight} />
      </View>
      <View className="flex-1">
        <Text className="text-xl font-bold text-brand">{count}</Text>
        <Text className="text-xs text-muted" numberOfLines={2}>
          {label}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.muted} />
    </Pressable>
  );
}

type Series = { key: string; label: string; color: string };

// Biểu đồ cột (chồng) vẽ bằng View: không cần thư viện, chạy cả native và web.
export function BarChart<T extends { date: string }>({ data, series, height = 180 }: { data: T[]; series: Series[]; height?: number }) {
  const [active, setActive] = useState<number | null>(null);
  const totals = data.map((row) => series.reduce((sum, s) => sum + Number((row as Record<string, unknown>)[s.key] ?? 0), 0));
  const max = Math.max(1, ...totals);
  const shown = active ?? data.length - 1;

  return (
    <View className="gap-2">
      <View className="flex-row flex-wrap gap-3">
        {series.map((s) => (
          <View key={s.key} className="flex-row items-center gap-1">
            <View className="h-3 w-3 rounded-sm" style={{ backgroundColor: s.color }} />
            <Text className="text-xs text-muted">{s.label}</Text>
          </View>
        ))}
      </View>
      {data[shown] ? (
        <Text className="text-xs text-muted">
          {`${formatDate(data[shown].date)}: `}
          {series.map((s) => `${s.label} ${formatShortVnd(Number((data[shown] as Record<string, unknown>)[s.key] ?? 0))}`).join(" · ")}
        </Text>
      ) : null}
      <View className="flex-row items-end gap-[2px]" style={{ height }}>
        {data.map((row, index) => (
          <Pressable
            key={row.date}
            onPress={() => setActive(index)}
            onHoverIn={() => setActive(index)}
            accessibilityLabel={`${formatDate(row.date)}: ${formatShortVnd(totals[index])}`}
            className="h-full flex-1 justify-end">
            {series.map((s) => {
              const value = Number((row as Record<string, unknown>)[s.key] ?? 0);
              return value > 0 ? (
                <View key={s.key} style={{ height: (value / max) * height, backgroundColor: s.color, opacity: active === null || active === index ? 1 : 0.5 }} />
              ) : null;
            })}
          </Pressable>
        ))}
      </View>
      <View className="flex-row justify-between">
        <Text className="text-xs text-muted">{data[0] ? formatDate(data[0].date).slice(0, 5) : ""}</Text>
        <Text className="text-xs text-muted">{`Cao nhất ${formatShortVnd(max)}`}</Text>
        <Text className="text-xs text-muted">{data.at(-1) ? formatDate(data.at(-1)!.date).slice(0, 5) : ""}</Text>
      </View>
    </View>
  );
}

// Thanh ngang tỉ lệ (booking theo trạng thái, phương thức thanh toán).
export function HBars({ items }: { items: { label: string; value: number; display?: string; color?: string }[] }) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <View className="gap-2">
      {items.map((item) => (
        <View key={item.label} className="gap-1">
          <View className="flex-row justify-between">
            <Text className="text-sm text-brand">{item.label}</Text>
            <Text className="text-sm font-semibold text-brand">{item.display ?? item.value}</Text>
          </View>
          <View className="h-2 overflow-hidden rounded-full bg-surface">
            <View className="h-2 rounded-full" style={{ width: `${(item.value / max) * 100}%`, backgroundColor: item.color ?? Colors.brandLight }} />
          </View>
        </View>
      ))}
    </View>
  );
}

export type Range = { from: string; to: string; key: string };

export function defaultRange(days = 30): Range {
  const to = todayIso();
  return { from: addDays(to, -(days - 1)), to, key: `${days}` };
}

// Bộ chọn kỳ: 7 ngày · 30 ngày · Tháng này · 90 ngày.
export function RangePicker({ value, onChange }: { value: Range; onChange: (range: Range) => void }) {
  const today = todayIso();
  const options: Range[] = [
    defaultRange(7),
    defaultRange(30),
    { from: `${today.slice(0, 7)}-01`, to: today, key: "month" },
    defaultRange(90),
  ];
  const labels: Record<string, string> = { "7": "7 ngày", "30": "30 ngày", month: "Tháng này", "90": "90 ngày" };
  return (
    <View className="flex-row flex-wrap items-center gap-2">
      {options.map((option) => (
        <Chip key={option.key} label={labels[option.key]} active={value.key === option.key} onPress={() => onChange(option)} />
      ))}
      <Text className="text-xs text-muted">{`${formatDate(value.from)} → ${formatDate(value.to)}`}</Text>
    </View>
  );
}
