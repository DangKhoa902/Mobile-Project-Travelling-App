import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import { Screen } from "@/components/screen";
import { StateView } from "@/components/state-view";
import { useAuthStore } from "@/store/auth-store";

const ROLE_LABEL = { USER: "Khách hàng", STAFF: "Nhân viên CSKH", ADMIN: "Quản trị viên" } as const;

export default function ProfileScreen() {
  const { status, user, logout } = useAuthStore();
  const queryClient = useQueryClient();

  if (status === "loading") {
    return (
      <Screen title="Tài khoản">
        <StateView kind="loading" />
      </Screen>
    );
  }

  if (!user) {
    return (
      <Screen title="Đăng nhập">
        <LoginForm />
      </Screen>
    );
  }

  return (
    <Screen title="Tài khoản">
      <View className="gap-1 rounded-2xl bg-surface-card p-5">
        <Text className="text-xl font-bold text-brand">{user.name}</Text>
        <Text className="text-sm text-muted">{user.email}</Text>
        {user.phone ? <Text className="text-sm text-muted">{user.phone}</Text> : null}
        <Text className="mt-2 text-xs font-semibold uppercase text-brand-light">{ROLE_LABEL[user.role]}</Text>
      </View>
      <Pressable
        onPress={async () => {
          await logout();
          // Xóa dữ liệu cá nhân đã cache của tài khoản cũ.
          queryClient.clear();
        }}
        className="mt-6 items-center rounded-2xl border border-danger py-3 active:opacity-70">
        <Text className="font-semibold text-danger">Đăng xuất</Text>
      </Pressable>
    </Screen>
  );
}

function LoginForm() {
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError("Vui lòng nhập email và mật khẩu");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Đăng nhập thất bại");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View className="gap-3">
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor="#71827A"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        className="rounded-2xl bg-surface-card px-4 py-3 text-base text-brand"
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Mật khẩu"
        placeholderTextColor="#71827A"
        secureTextEntry
        autoComplete="password"
        onSubmitEditing={handleLogin}
        className="rounded-2xl bg-surface-card px-4 py-3 text-base text-brand"
      />
      {error ? <Text className="text-sm text-danger">{error}</Text> : null}
      <Pressable
        onPress={handleLogin}
        disabled={isSubmitting}
        className="items-center rounded-2xl bg-brand py-3 active:opacity-80">
        {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text className="font-semibold text-white">Đăng nhập</Text>}
      </Pressable>
    </View>
  );
}
