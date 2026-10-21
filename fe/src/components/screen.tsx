import type { ReactNode } from "react";
import { Platform, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MaxContentWidth } from "@/constants/theme";

// Khung chung cho mỗi tab: an toàn tai thỏ, giới hạn chiều rộng trên web/tablet.
export function Screen({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      <View
        className="w-full flex-1 self-center px-4"
        // Web: chừa chỗ cho thanh tab nổi phía trên.
        style={{ maxWidth: MaxContentWidth, paddingTop: Platform.OS === "web" ? 72 : 8 }}>
        {title ? <Text className="mb-3 text-2xl font-bold text-brand">{title}</Text> : null}
        {children}
      </View>
    </SafeAreaView>
  );
}
