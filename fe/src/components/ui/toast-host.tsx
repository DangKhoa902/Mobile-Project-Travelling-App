import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { useToastStore } from "@/store/toast-store";

const icons = { success: "checkmark-circle", error: "alert-circle", info: "information-circle" } as const;
const colors = { success: "#8FD6B5", error: "#FDBA8C", info: Colors.white } as const;

// Đặt một lần ở layout gốc; hiện các toast từ toast-store ở đáy màn hình.
export function ToastHost() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);
  const insets = useSafeAreaInsets();
  if (toasts.length === 0) return null;

  return (
    <View pointerEvents="box-none" className="absolute inset-x-0 items-center gap-2 px-4" style={{ bottom: insets.bottom + 72 }}>
      {toasts.map((item) => (
        <View key={item.id} className="w-full max-w-md flex-row items-center gap-3 rounded-xl bg-brand px-4 py-3 shadow-lg" accessibilityLiveRegion="polite">
          <Ionicons name={icons[item.tone]} size={20} color={colors[item.tone]} />
          <Text className="flex-1 text-sm text-white">{item.message}</Text>
          {item.action ? (
            <Pressable
              onPress={() => {
                item.action?.onPress();
                dismiss(item.id);
              }}
              hitSlop={8}>
              <Text className="font-bold text-accent">{item.action.label}</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  );
}
