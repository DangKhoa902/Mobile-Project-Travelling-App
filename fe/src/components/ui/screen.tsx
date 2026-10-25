import { router } from "expo-router";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { IconButton } from "@/components/ui/button";
import { Colors, MaxContentWidth } from "@/constants/theme";

type ScreenProps = {
  title?: string;
  subtitle?: string;
  // Hiện nút quay lại; `backHref` dùng khi mở trực tiếp bằng link (không có lịch sử).
  back?: boolean;
  backHref?: string;
  right?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  maxWidth?: number;
  padded?: boolean;
};

export function goBack(fallback = "/") {
  if (router.canGoBack()) router.back();
  else router.replace(fallback as never);
}

// Khung chung: an toàn tai thỏ, tiêu đề + nút quay lại, giới hạn chiều rộng trên web,
// thanh cố định đáy (`footer`) và tránh bàn phím che nút.
export function Screen({
  title,
  subtitle,
  back,
  backHref = "/",
  right,
  children,
  footer,
  scroll = true,
  refreshing,
  onRefresh,
  maxWidth = MaxContentWidth,
  padded = true,
}: ScreenProps) {
  const body = <View className={`w-full self-center ${padded ? "px-4 pb-8" : ""}`} style={{ maxWidth }}>{children}</View>;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {title || back ? (
          <View className="w-full self-center flex-row items-center gap-1 px-2 pb-2 pt-2" style={{ maxWidth }}>
            {back ? <IconButton icon="arrow-back" label="Quay lại" onPress={() => goBack(backHref)} /> : <View className="w-2" />}
            <View className="flex-1">
              {title ? (
                <Text className="text-xl font-bold text-brand" numberOfLines={1}>
                  {title}
                </Text>
              ) : null}
              {subtitle ? (
                <Text className="text-sm text-muted" numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            {right}
          </View>
        ) : null}
        {scroll ? (
          <ScrollView
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1 }}
            refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={Colors.brand} /> : undefined}>
            {body}
          </ScrollView>
        ) : (
          <View className="flex-1">{body}</View>
        )}
        {footer ? (
          <SafeAreaView edges={["bottom"]} className="border-t border-line bg-surface-card">
            <View className="w-full self-center px-4 py-3" style={{ maxWidth }}>
              {footer}
            </View>
          </SafeAreaView>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
