import Ionicons from "@expo/vector-icons/Ionicons";
import { router, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Avatar } from "@/components/ui/avatar";
import { Badge, PartnerBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Screen } from "@/components/ui/screen";
import { StateView } from "@/components/ui/state-view";
import { Colors } from "@/constants/theme";
import { errorMessage } from "@/services/api/client";
import { authService } from "@/services/auth.service";
import { useMyPartner } from "@/services/partner.service";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "@/store/toast-store";
import { ROLE_LABEL } from "@/utils/format";

// T5 – Tài khoản: hồ sơ, menu, mục theo vai trò, xác thực email, đăng xuất.
export default function ProfileScreen() {
  const { status, user, logout } = useAuthStore();
  const [confirmLogout, setConfirmLogout] = useState(false);

  if (status === "loading") return <Screen title="Tài khoản"><StateView kind="loading" /></Screen>;

  if (!user) {
    return (
      <Screen title="Tài khoản">
        <View className="items-center gap-4 py-12">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-brand-soft">
            <Ionicons name="person" size={40} color={Colors.brand} />
          </View>
          <Text className="text-center text-lg font-bold text-brand">Đăng nhập để đặt chỗ, lưu địa điểm yêu thích và nhận ưu đãi</Text>
          <View className="w-full max-w-sm gap-2">
            <Button title="Đăng nhập" full onPress={() => router.push("/login")} />
            <Button title="Tạo tài khoản" full variant="outline" onPress={() => router.push("/register")} />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen title="Tài khoản" maxWidth={720}>
      <View className="gap-5">
        <View className="flex-row items-center gap-4 rounded-2xl border border-line bg-surface-card p-4">
          <Avatar name={user.name} url={user.avatarUrl} size={64} />
          <View className="flex-1 gap-1">
            <Text className="text-lg font-bold text-brand">{user.name}</Text>
            <Text className="text-sm text-muted">{user.email}</Text>
            <Badge label={ROLE_LABEL[user.role]} tone={user.role === "USER" ? "gray" : "green"} />
          </View>
        </View>

        {!user.emailVerifiedAt ? <VerifyEmailBanner /> : null}

        <RoleEntry />

        <Menu
          items={[
            { label: "Sửa hồ sơ", icon: "person-circle-outline", href: "/profile/edit" },
            { label: "Đổi mật khẩu", icon: "key-outline", href: "/profile/password" },
            { label: "Đánh giá của tôi", icon: "star-outline", href: "/profile/reviews" },
            { label: "Địa điểm yêu thích", icon: "heart-outline", href: "/favorites" },
            { label: "Hỗ trợ", icon: "chatbubbles-outline", href: "/inbox" },
            { label: "Thiết bị đang đăng nhập", icon: "phone-portrait-outline", href: "/profile/sessions" },
          ]}
        />

        <Button title="Đăng xuất" variant="outline" icon="log-out-outline" onPress={() => setConfirmLogout(true)} />
      </View>
      <Dialog
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        title="Đăng xuất?"
        message="Bạn sẽ cần đăng nhập lại để xem booking và thông báo."
        confirmLabel="Đăng xuất"
        destructive
        onConfirm={async () => {
          await logout();
          router.replace("/");
        }}
      />
    </Screen>
  );
}

// Mục thêm theo vai trò (FR-10).
function RoleEntry() {
  const user = useAuthStore((state) => state.user)!;
  const partner = useMyPartner();

  if (user.role === "OWNER") {
    return <Button title="Quản lý cơ sở" icon="business-outline" onPress={() => router.push("/owner")} />;
  }
  if (user.role === "STAFF" || user.role === "ADMIN") {
    return <Button title="Trang quản trị" icon="speedometer-outline" onPress={() => router.push("/admin")} />;
  }
  return (
    <Pressable onPress={() => router.push("/profile/partner")} className="flex-row items-center gap-3 rounded-2xl bg-brand p-4 active:opacity-90">
      <Ionicons name="briefcase-outline" size={24} color={Colors.white} />
      <View className="flex-1">
        <Text className="text-base font-bold text-white">Trở thành đối tác</Text>
        <Text className="text-sm text-brand-soft">Đăng cơ sở lưu trú của bạn lên Travelling App</Text>
      </View>
      {partner.data ? <PartnerBadge status={partner.data.status} /> : <Ionicons name="chevron-forward" size={20} color={Colors.white} />}
    </Pressable>
  );
}

function VerifyEmailBanner() {
  const [sending, setSending] = useState(false);
  async function resend() {
    setSending(true);
    try {
      const result = await authService.resendVerification();
      toast.success("Đã gửi lại email xác thực");
      // Chế độ email "console" khi dev: mở luôn link xác thực.
      if (result.devVerificationToken) router.push(`/verify-email?token=${result.devVerificationToken}`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSending(false);
    }
  }
  return (
    <Banner tone="warning" title="Xác thực email để trở thành đối tác">
      <View className="gap-2">
        <Text className="text-sm text-brand">Chúng tôi đã gửi link xác thực tới email của bạn.</Text>
        <View className="items-start">
          <Button title="Gửi lại email" size="sm" variant="outline" loading={sending} onPress={resend} />
        </View>
      </View>
    </Banner>
  );
}

function Menu({ items }: { items: { label: string; icon: keyof typeof Ionicons.glyphMap; href: Href }[] }) {
  return (
    <View className="overflow-hidden rounded-2xl border border-line bg-surface-card">
      {items.map((item, index) => (
        <Pressable
          key={item.label}
          onPress={() => router.push(item.href)}
          className={`min-h-14 flex-row items-center gap-3 px-4 active:bg-surface ${index < items.length - 1 ? "border-b border-line" : ""}`}>
          <Ionicons name={item.icon} size={20} color={Colors.brandLight} />
          <Text className="flex-1 text-base text-brand">{item.label}</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.muted} />
        </Pressable>
      ))}
    </View>
  );
}
