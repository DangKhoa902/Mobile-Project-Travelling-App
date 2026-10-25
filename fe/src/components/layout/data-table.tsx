import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { IconButton } from "@/components/ui/button";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import type { PageMeta } from "@/types/api";

export type Column<T> = {
  key: string;
  title: string;
  width?: number; // px; mặc định chia đều
  align?: "left" | "right";
  render: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  rows: T[];
  columns: Column<T>[];
  keyOf: (row: T) => string | number;
  onPress?: (row: T) => void;
  // Trên mobile (< 1024px) hiện thẻ dọc thay vì bảng.
  renderCard?: (row: T) => ReactNode;
};

// Bảng cho khu chủ địa điểm / quản trị: bảng có cột trên web, thẻ dọc trên mobile.
export function DataTable<T>({ rows, columns, keyOf, onPress, renderCard }: DataTableProps<T>) {
  const { isLg } = useBreakpoint();

  if (!isLg && renderCard) {
    return (
      <View className="gap-3">
        {rows.map((row) => (
          <Pressable key={keyOf(row)} onPress={onPress ? () => onPress(row) : undefined} disabled={!onPress} className="active:opacity-90">
            {renderCard(row)}
          </Pressable>
        ))}
      </View>
    );
  }

  const minWidth = columns.reduce((sum, column) => sum + (column.width ?? 140), 0);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ minWidth: "100%" }}>
      <View className="overflow-hidden rounded-2xl border border-line bg-surface-card" style={{ minWidth, width: "100%" }}>
        <View className="flex-row border-b border-line bg-surface px-3 py-2">
          {columns.map((column) => (
            <Text
              key={column.key}
              className={`text-xs font-semibold uppercase text-muted ${column.align === "right" ? "text-right" : ""}`}
              style={column.width ? { width: column.width } : { flex: 1, minWidth: 140 }}>
              {column.title}
            </Text>
          ))}
        </View>
        {rows.map((row, index) => (
          <Pressable
            key={keyOf(row)}
            onPress={onPress ? () => onPress(row) : undefined}
            disabled={!onPress}
            className={`flex-row items-center px-3 py-3 ${index < rows.length - 1 ? "border-b border-line" : ""} ${onPress ? "active:bg-surface" : ""}`}>
            {columns.map((column) => {
              const content = column.render(row);
              return (
                <View
                  key={column.key}
                  className={`pr-2 ${column.align === "right" ? "items-end" : ""}`}
                  style={column.width ? { width: column.width } : { flex: 1, minWidth: 140 }}>
                  {typeof content === "string" || typeof content === "number" ? (
                    <Text className="text-sm text-brand" numberOfLines={2}>
                      {content}
                    </Text>
                  ) : (
                    content
                  )}
                </View>
              );
            })}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

export function Pager({ meta, onChange }: { meta?: PageMeta; onChange: (page: number) => void }) {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <View className="flex-row items-center justify-center gap-2 py-3">
      <IconButton icon="chevron-back" label="Trang trước" onPress={() => onChange(meta.page - 1)} className={meta.page <= 1 ? "opacity-30" : ""} />
      <Text className="text-sm text-muted">{`Trang ${meta.page}/${meta.totalPages} · ${meta.total} mục`}</Text>
      <IconButton
        icon="chevron-forward"
        label="Trang sau"
        onPress={() => meta.page < meta.totalPages && onChange(meta.page + 1)}
        className={meta.page >= meta.totalPages ? "opacity-30" : ""}
      />
    </View>
  );
}
