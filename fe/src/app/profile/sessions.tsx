import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Screen } from "@/components/ui/screen";
import { QueryState } from "@/components/ui/state-view";
import { Colors } from "@/constants/theme";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "@/store/toast-store";
import { formatDateTime, relativeTime } from "@/utils/format";

// P5 – Thiết bị đang đăng nhập: đăng xuất từng thiết bị hoặc tất cả.
export default function SessionsScreen() {
  const { sessionId, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const sessions = useQuery({ queryKey: ["sessions"], queryFn: authService.sessions });
  const revoke = useMutation({ mutationFn: authService.revokeSession, onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["sessions"] }) });
  const [confirmAll, setConfirmAll] = useState(false);

  return (
    <Screen back backHref="/profile" title="Thiết bị đang đăng nhập" maxWidth={640}>
      <QueryState query={sessions}>
        {(data) => (
          <View className="gap-3">
            {data.map((session) => {
              const current = session.id === sessionId;
              return (
                <Card key={session.id} className="flex-row items-center gap-3">
                  <Ionicons name={session.deviceName === "Trình duyệt" || !session.deviceName ? "desktop-outline" : "phone-portrait-outline"} size={28} color={Colors.brandLight} />
                  <View className="flex-1 gap-0.5">
                    <View className="flex-row items-center gap-2">
                      <Text className="font-bold text-brand">{session.deviceName ?? "Thiết bị không rõ"}</Text>
                      {current ? <Badge label="Thiết bị này" tone="green" /> : null}
                    </View>
                    <Text className="text-xs text-muted" numberOfLines={1}>
                      {`${session.ip ?? ""} · ${session.userAgent ?? ""}`}
                    </Text>
                    <Text className="text-xs text-muted">
                      {session.lastUsedAt ? `Dùng lần cuối ${relativeTime(session.lastUsedAt)}` : `Đăng nhập ${formatDateTime(session.createdAt)}`}
                    </Text>
                  </View>
                  {current ? null : (
                    <Button
                      title="Đăng xuất"
                      size="sm"
                      variant="outline"
                      loading={revoke.isPending && revoke.variables === session.id}
                      onPress={() => revoke.mutate(session.id, { onSuccess: () => toast.success("Đã đăng xuất thiết bị") })}
                    />
                  )}
                </Card>
              );
            })}
            <Button title="Đăng xuất tất cả thiết bị" variant="danger" icon="log-out-outline" onPress={() => setConfirmAll(true)} />
          </View>
        )}
      </QueryState>
      <Dialog
        open={confirmAll}
        onClose={() => setConfirmAll(false)}
        title="Đăng xuất tất cả?"
        message="Mọi thiết bị, kể cả thiết bị này, sẽ phải đăng nhập lại."
        confirmLabel="Đăng xuất tất cả"
        destructive
        onConfirm={async () => {
          await authService.logoutAll();
          await logout();
          router.replace("/login");
        }}
      />
    </Screen>
  );
}
