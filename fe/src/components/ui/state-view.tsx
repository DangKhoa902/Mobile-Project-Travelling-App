import Ionicons from "@expo/vector-icons/Ionicons";
import { ActivityIndicator, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Colors } from "@/constants/theme";
import { errorMessage } from "@/services/api/client";

type StateViewProps =
  | { kind: "loading"; compact?: boolean }
  | { kind: "error"; error: unknown; onRetry?: () => void; compact?: boolean }
  | { kind: "empty"; message: string; icon?: keyof typeof Ionicons.glyphMap; action?: { label: string; onPress: () => void }; compact?: boolean };

// Một chỗ hiển thị đang tải / lỗi / rỗng để mọi màn hình nhất quán.
export function StateView(props: StateViewProps) {
  const padding = props.compact ? "py-6" : "py-16";
  if (props.kind === "loading") {
    return (
      <View className={`items-center justify-center ${padding}`}>
        <ActivityIndicator color={Colors.brand} />
      </View>
    );
  }

  const icon = props.kind === "error" ? "cloud-offline-outline" : (props.icon ?? "file-tray-outline");
  const message = props.kind === "error" ? errorMessage(props.error) : props.message;
  return (
    <View className={`items-center justify-center gap-3 px-6 ${padding}`}>
      <Ionicons name={icon} size={props.compact ? 28 : 40} color={Colors.muted} />
      <Text className="text-center text-base text-muted">{message}</Text>
      {props.kind === "error" && props.onRetry ? <Button title="Thử lại" size="sm" onPress={props.onRetry} /> : null}
      {props.kind === "empty" && props.action ? <Button title={props.action.label} size="sm" onPress={props.action.onPress} /> : null}
    </View>
  );
}

// Gói 3 trạng thái cho một query: chỉ render children khi đã có dữ liệu.
export function QueryState<T>({
  query,
  empty,
  children,
  compact,
}: {
  query: { data: T | undefined; isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown };
  empty?: (data: T) => { message: string; icon?: keyof typeof Ionicons.glyphMap; action?: { label: string; onPress: () => void } } | null;
  children: (data: T) => React.ReactNode;
  compact?: boolean;
}) {
  if (query.isPending) return <StateView kind="loading" compact={compact} />;
  if (query.isError || query.data === undefined) return <StateView kind="error" error={query.error} onRetry={() => void query.refetch()} compact={compact} />;
  const emptyState = empty?.(query.data);
  if (emptyState) return <StateView kind="empty" compact={compact} {...emptyState} />;
  return <>{children(query.data)}</>;
}
