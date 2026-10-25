import { router, usePathname } from "expo-router";
import type { ReactNode } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { StateView } from "@/components/ui/state-view";
import { useAuthStore } from "@/store/auth-store";

export function loginHref(redirect: string) {
  return `/login?redirect=${encodeURIComponent(redirect)}` as const;
}

// BR-01: yêu thích, đặt chỗ, hộp thư... chỉ dành cho người đã đăng nhập.
export function RequireAuth({ message, children }: { message: string; children: ReactNode }) {
  const status = useAuthStore((state) => state.status);
  const pathname = usePathname();

  if (status === "loading") return <StateView kind="loading" />;
  if (status === "guest") {
    return (
      <View className="items-center gap-4">
        <StateView kind="empty" icon="lock-closed-outline" message={message} />
        <View className="flex-row gap-2">
          <Button title="Đăng nhập" onPress={() => router.push(loginHref(pathname))} />
          <Button title="Tạo tài khoản" variant="outline" onPress={() => router.push("/register")} />
        </View>
      </View>
    );
  }
  return <>{children}</>;
}
