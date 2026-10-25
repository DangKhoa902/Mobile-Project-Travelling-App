import Ionicons from "@expo/vector-icons/Ionicons";
import { Redirect, router, Stack, usePathname } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { loginHref } from "@/components/layout/require-auth";
import { Avatar } from "@/components/ui/avatar";
import { StateView } from "@/components/ui/state-view";
import { Colors } from "@/constants/theme";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { useAuthStore } from "@/store/auth-store";
import type { Role } from "@/types/api";
import { ROLE_LABEL } from "@/utils/format";

export type NavItem = { href: string; label: string; icon: keyof typeof Ionicons.glyphMap; roles?: Role[]; exact?: boolean };

type ManageShellProps = { title: string; base: "/owner" | "/admin"; roles: Role[]; items: NavItem[] };

// Khung khu chủ địa điểm / quản trị: chặn vai trò, sidebar trên web ≥ 1024px, stack trên mobile.
// Đây chỉ là chặn ở giao diện; backend vẫn kiểm tra quyền ở từng API.
export function ManageShell({ title, base, roles, items }: ManageShellProps) {
  const { status, user } = useAuthStore();
  const { isLg } = useBreakpoint();
  const pathname = usePathname();

  if (status === "loading") return <StateView kind="loading" />;
  if (status === "guest" || !user) return <Redirect href={loginHref(pathname)} />;
  if (!roles.includes(user.role)) return <Redirect href="/profile" />;

  const visible = items.filter((item) => !item.roles || item.roles.includes(user.role));
  const stack = <Stack screenOptions={{ headerShown: false }} />;
  if (!isLg) return stack;

  return (
    <View className="flex-1 flex-row bg-surface">
      <SafeAreaView edges={["top", "bottom"]} className="w-64 border-r border-line bg-surface-card">
        <ScrollView contentContainerClassName="gap-1 p-3">
          <Pressable onPress={() => router.push("/")} className="mb-3 flex-row items-center gap-2 px-2 py-2">
            <Ionicons name="compass" size={26} color={Colors.brand} />
            <View>
              <Text className="text-base font-bold text-brand">Travelling App</Text>
              <Text className="text-xs text-muted">{title}</Text>
            </View>
          </Pressable>
          {visible.map((item) => {
            const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Pressable
                key={item.href}
                onPress={() => router.navigate(item.href as never)}
                className={`flex-row items-center gap-3 rounded-xl px-3 py-2.5 ${active ? "bg-brand-soft" : "active:bg-surface"}`}>
                <Ionicons name={item.icon} size={18} color={active ? Colors.brand : Colors.muted} />
                <Text className={`text-sm ${active ? "font-semibold text-brand" : "text-muted"}`}>{item.label}</Text>
              </Pressable>
            );
          })}
          <Pressable onPress={() => router.push("/profile")} className="mt-4 flex-row items-center gap-3 rounded-xl border border-line px-3 py-2.5">
            <Avatar name={user.name} url={user.avatarUrl} size={32} />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-brand" numberOfLines={1}>
                {user.name}
              </Text>
              <Text className="text-xs text-muted">{ROLE_LABEL[user.role]}</Text>
            </View>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
      <View className="flex-1">{stack}</View>
    </View>
  );
}

// Trên mobile, trang tổng quan hiện lưới nút tắt thay cho sidebar.
export function ShortcutGrid({ items }: { items: NavItem[] }) {
  const user = useAuthStore((state) => state.user);
  const { isLg } = useBreakpoint();
  if (isLg) return null;
  return (
    <View className="flex-row flex-wrap gap-2">
      {items
        .filter((item) => !item.exact && (!item.roles || (user && item.roles.includes(user.role))))
        .map((item) => (
          <Pressable
            key={item.href}
            onPress={() => router.push(item.href as never)}
            className="w-[31%] items-center gap-1 rounded-2xl border border-line bg-surface-card p-3 active:opacity-80">
            <Ionicons name={item.icon} size={22} color={Colors.brandLight} />
            <Text className="text-center text-xs font-medium text-brand" numberOfLines={2}>
              {item.label}
            </Text>
          </Pressable>
        ))}
    </View>
  );
}
