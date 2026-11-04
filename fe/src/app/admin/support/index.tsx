import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { DataTable } from "@/components/layout/data-table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Chip, Segmented } from "@/components/ui/choice";
import { Screen } from "@/components/ui/screen";
import { QueryState } from "@/components/ui/state-view";
import { useConversations } from "@/services/support.service";
import { relativeTime } from "@/utils/format";

const HANDOFF_REASONS: Record<string, string> = {
  CUSTOMER_REQUEST: "Khách yêu cầu",
  STAFF_TAKEOVER: "Nhân viên tiếp quản",
  AI_ERROR: "AI gặp lỗi",
  AI_DISABLED: "AI đang tắt",
  AI_HANDOFF: "AI chuyển nhân viên",
};

function HandlerBadges({ handler, reason }: { handler: "AI" | "STAFF"; reason: string | null }) {
  return (
    <View className="flex-row flex-wrap items-center gap-1">
      {handler === "AI" ? <Badge label="AI đang xử lý" tone="blue" /> : null}
      {reason ? <Badge label={HANDOFF_REASONS[reason] ?? reason} tone="orange" /> : null}
    </View>
  );
}

// M5 – Hàng đợi CSKH: sắp theo tin mới nhất, lọc Mở / Đã đóng, cột người phụ trách.
export default function SupportQueue() {
  const [status, setStatus] = useState<"OPEN" | "CLOSED">("OPEN");
  const [handler, setHandler] = useState<"ALL" | "STAFF" | "AI">("ALL");
  const conversations = useConversations(status, true, handler === "ALL" ? undefined : handler);
  return (
    <Screen title="Hàng đợi CSKH" refreshing={conversations.isRefetching} onRefresh={() => void conversations.refetch()}>
      <View className="gap-4">
        <Segmented value={status} onChange={setStatus} options={[{ value: "OPEN", label: "Đang mở" }, { value: "CLOSED", label: "Đã đóng" }]} />
        <View className="flex-row flex-wrap gap-2">
          <Chip label="Tất cả" active={handler === "ALL"} onPress={() => setHandler("ALL")} />
          <Chip label="Chờ nhân viên" active={handler === "STAFF"} onPress={() => setHandler("STAFF")} />
          <Chip label="AI đang xử lý" active={handler === "AI"} onPress={() => setHandler("AI")} />
        </View>
        <QueryState query={conversations} empty={(data) => (data.data.length === 0 ? { message: "Không có hội thoại nào", icon: "chatbubbles-outline" } : null)}>
          {(data) => (
            <DataTable
              rows={data.data}
              keyOf={(row) => row.id}
              onPress={(row) => router.push(`/admin/support/${row.id}`)}
              renderCard={(row) => (
                <Card className="gap-1">
                  <View className="flex-row items-center justify-between gap-2">
                    <Text className="flex-1 font-bold text-brand" numberOfLines={1}>
                      {row.subject}
                    </Text>
                    <Text className="text-xs text-muted">{relativeTime(row.lastMessageAt)}</Text>
                  </View>
                  <Text className="text-sm text-muted">{`${row.customer.name} · ${row.staff ? `Phụ trách: ${row.staff.name}` : "Chưa có người nhận"}`}</Text>
                  <Text className="text-sm text-brand" numberOfLines={1}>
                    {row.messages[0]?.content ?? ""}
                  </Text>
                  <HandlerBadges handler={row.handler} reason={row.handoffReason} />
                </Card>
              )}
              columns={[
                {
                  key: "subject",
                  title: "Chủ đề",
                  render: (row) => (
                    <View className="gap-1">
                      <Text className="font-semibold text-brand">{row.subject}</Text>
                      <HandlerBadges handler={row.handler} reason={row.handoffReason} />
                    </View>
                  ),
                },
                { key: "customer", title: "Khách", width: 160, render: (row) => row.customer.name },
                { key: "last", title: "Tin cuối", render: (row) => row.messages[0]?.content ?? "" },
                { key: "staff", title: "Người phụ trách", width: 160, render: (row) => (row.staff ? row.staff.name : <Badge label="Chưa nhận" tone="yellow" />) },
                { key: "time", title: "Cập nhật", width: 120, render: (row) => relativeTime(row.lastMessageAt) },
              ]}
            />
          )}
        </QueryState>
      </View>
    </Screen>
  );
}
