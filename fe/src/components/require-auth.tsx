import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { StateView } from "@/components/state-view";
import { useAuthStore } from "@/store/auth-store";

// BR-01: yêu thích, đặt chỗ, hộp thư... chỉ dành cho người dùng đã đăng nhập.
export function RequireAuth({ message, children }: { message: string; children: ReactNode }) {
  const status = useAuthStore((state) => state.status);

  if (status === "loading") return <StateView kind="loading" />;
  if (status === "guest") {
    return (
      <View className="items-center gap-4 px-8 py-16">
        <Text className="text-center text-base text-muted">{message}</Text>
        <Pressable onPress={() => router.navigate("/profile")} className="rounded-full bg-brand px-6 py-3 active:opacity-80">
          <Text className="font-semibold text-white">Đăng nhập</Text>
        </Pressable>
      </View>
    );
  }
  return <>{children}</>;
}
