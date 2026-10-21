import Ionicons from "@expo/vector-icons/Ionicons";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

type StateViewProps =
  | { kind: "loading" }
  | { kind: "error"; message: string; onRetry?: () => void }
  | { kind: "empty"; message: string; icon?: keyof typeof Ionicons.glyphMap };

// Một chỗ hiển thị các trạng thái tải / lỗi / rỗng để mọi màn hình nhất quán.
export function StateView(props: StateViewProps) {
  if (props.kind === "loading") {
    return (
      <View className="items-center justify-center py-16">
        <ActivityIndicator color="#193B35" />
      </View>
    );
  }

  const icon = props.kind === "error" ? "cloud-offline-outline" : (props.icon ?? "file-tray-outline");
  return (
    <View className="items-center justify-center gap-3 px-8 py-16">
      <Ionicons name={icon} size={40} color="#71827A" />
      <Text className="text-center text-base text-muted">{props.message}</Text>
      {props.kind === "error" && props.onRetry ? (
        <Pressable onPress={props.onRetry} className="rounded-full bg-brand px-5 py-2 active:opacity-80">
          <Text className="font-semibold text-white">Thử lại</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
