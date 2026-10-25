import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";

import { Button, IconButton } from "@/components/ui/button";
import { Colors } from "@/constants/theme";
import { formatDate, todayIso } from "@/utils/format";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

type DateFieldProps = {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  required?: boolean;
  error?: string;
  min?: string;
  max?: string;
  placeholder?: string;
  // Ngày được tô màu (giá mùa) kèm chú thích.
  highlight?: (iso: string) => boolean;
  highlightLabel?: string;
  clearable?: boolean;
};

// Lịch chọn ngày tự vẽ (chạy giống nhau trên Android, iOS và web, không cần thư viện native).
export function DateField({ label, value, onChange, required, error, min, max, placeholder = "Chọn ngày", highlight, highlightLabel, clearable }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const initial = value ?? min ?? todayIso();
  const [month, setMonth] = useState(initial.slice(0, 7)); // "2026-11"

  const [year, monthIndex] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthIndex - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7; // thứ Hai đầu tuần
  const cells: (string | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];

  function shift(delta: number) {
    const date = new Date(Date.UTC(year, monthIndex - 1 + delta, 1));
    setMonth(date.toISOString().slice(0, 7));
  }

  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-brand">
        {label}
        {required ? <Text className="text-danger"> *</Text> : null}
      </Text>
      <Pressable
        onPress={() => {
          setMonth((value ?? min ?? todayIso()).slice(0, 7));
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={label}
        className={`min-h-12 flex-row items-center gap-2 rounded-xl border bg-surface-card px-3 ${error ? "border-danger" : "border-line"}`}>
        <Ionicons name="calendar-outline" size={18} color={Colors.muted} />
        <Text className={`flex-1 text-base ${value ? "text-brand" : "text-muted"}`}>{value ? formatDate(value) : placeholder}</Text>
        {clearable && value ? <IconButton icon="close-circle" label="Xóa ngày" color={Colors.muted} size={18} onPress={() => onChange(null)} /> : null}
      </Pressable>
      {error ? <Text className="text-xs text-danger">{error}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 items-center justify-center bg-black/40 p-4" onPress={() => setOpen(false)}>
          <Pressable className="w-full max-w-sm rounded-2xl bg-surface-card p-4" onPress={(event) => event.stopPropagation()}>
            <View className="mb-2 flex-row items-center justify-between">
              <IconButton icon="chevron-back" label="Tháng trước" onPress={() => shift(-1)} />
              <Text className="text-base font-bold text-brand">{`Tháng ${monthIndex}/${year}`}</Text>
              <IconButton icon="chevron-forward" label="Tháng sau" onPress={() => shift(1)} />
            </View>
            <View className="flex-row">
              {WEEKDAYS.map((day) => (
                <Text key={day} className="flex-1 text-center text-xs font-semibold text-muted">
                  {day}
                </Text>
              ))}
            </View>
            <View className="mt-1 flex-row flex-wrap">
              {cells.map((iso, index) => {
                if (!iso) return <View key={`empty-${index}`} style={{ width: `${100 / 7}%` }} className="h-10" />;
                const disabled = Boolean((min && iso < min) || (max && iso > max));
                const selected = iso === value;
                const marked = highlight?.(iso);
                return (
                  <View key={iso} style={{ width: `${100 / 7}%` }} className="h-10 items-center justify-center p-0.5">
                    <Pressable
                      disabled={disabled}
                      onPress={() => {
                        onChange(iso);
                        setOpen(false);
                      }}
                      accessibilityLabel={formatDate(iso)}
                      className={`h-9 w-9 items-center justify-center rounded-full ${selected ? "bg-brand" : marked ? "bg-accent-soft" : ""} ${disabled ? "opacity-30" : "active:opacity-70"}`}>
                      <Text className={`text-sm ${selected ? "font-bold text-white" : "text-brand"}`}>{Number(iso.slice(8))}</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
            {highlightLabel ? (
              <View className="mt-2 flex-row items-center gap-2">
                <View className="h-3 w-3 rounded-full bg-accent-soft" />
                <Text className="text-xs text-muted">{highlightLabel}</Text>
              </View>
            ) : null}
            <View className="mt-3 flex-row justify-end gap-2">
              <Button title="Hôm nay" size="sm" variant="ghost" onPress={() => setMonth(todayIso().slice(0, 7))} />
              <Button title="Đóng" size="sm" variant="outline" onPress={() => setOpen(false)} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
