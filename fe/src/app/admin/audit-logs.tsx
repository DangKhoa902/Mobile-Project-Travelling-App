import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { DataTable, Pager } from "@/components/layout/data-table";
import { Card } from "@/components/ui/card";
import { Chip, ChipRow } from "@/components/ui/choice";
import { DateField } from "@/components/ui/date-field";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { QueryState } from "@/components/ui/state-view";
import { useAuditLogs } from "@/services/admin.service";
import type { AuditLog } from "@/types/api";
import { AUDIT_ACTION_LABEL, formatDateTime } from "@/utils/format";

const GROUPS = [
  { value: undefined, label: "Tất cả" },
  { value: "partner.", label: "Đối tác" },
  { value: "listing.", label: "Tin đăng" },
  { value: "booking.", label: "Booking" },
  { value: "review.", label: "Đánh giá" },
  { value: "payout.", label: "Đối soát" },
  { value: "user.", label: "Người dùng" },
  { value: "voucher.", label: "Voucher" },
];

// M15 – Nhật ký quản trị (ADMIN): lọc theo nhóm hành động, đối tượng, khoảng ngày; xem trước / sau.
export default function AuditLogsScreen() {
  const params = useLocalSearchParams<{ entity?: string; entityId?: string }>();
  const [action, setAction] = useState<string | undefined>();
  const [entity, setEntity] = useState(params.entity ?? "");
  const [entityId, setEntityId] = useState(params.entityId ?? "");
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<number | null>(null);
  const logs = useAuditLogs({ action, entity: entity.trim() || undefined, entityId: entityId.trim() || undefined, from: from ?? undefined, to: to ?? undefined, page });

  return (
    <Screen title="Nhật ký quản trị">
      <View className="gap-3">
        <ChipRow>
          {GROUPS.map((group) => (
            <Chip key={group.label} label={group.label} active={action === group.value} onPress={() => { setAction(group.value); setPage(1); }} />
          ))}
        </ChipRow>
        <View className="gap-2 md:flex-row">
          <Input className="flex-1" placeholder="Đối tượng (Booking, PartnerProfile...)" value={entity} onChangeText={setEntity} autoCapitalize="none" />
          <Input className="flex-1" placeholder="Mã đối tượng" value={entityId} onChangeText={setEntityId} />
          <View className="flex-1">
            <DateField label="Từ ngày" value={from} onChange={setFrom} clearable />
          </View>
          <View className="flex-1">
            <DateField label="Đến ngày" value={to} onChange={setTo} min={from ?? undefined} clearable />
          </View>
        </View>
        <QueryState query={logs} empty={(data) => (data.data.length === 0 ? { message: "Không có nhật ký phù hợp", icon: "document-text-outline" } : null)}>
          {(data) => (
            <>
              <DataTable
                rows={data.data}
                keyOf={(row) => row.id}
                onPress={(row) => setOpen(open === row.id ? null : row.id)}
                renderCard={(row) => (
                  <Card className="gap-1">
                    <View className="flex-row justify-between gap-2">
                      <Text className="flex-1 font-bold text-brand">{AUDIT_ACTION_LABEL[row.action] ?? row.action}</Text>
                      <Text className="text-xs text-muted">{formatDateTime(row.createdAt)}</Text>
                    </View>
                    <Text className="text-sm text-muted">{`${row.actor?.name ?? "Hệ thống"} · ${row.entity} #${row.entityId}`}</Text>
                    {open === row.id ? <Diff log={row} /> : null}
                  </Card>
                )}
                columns={[
                  { key: "time", title: "Thời gian", width: 150, render: (row) => formatDateTime(row.createdAt) },
                  { key: "actor", title: "Người thực hiện", width: 180, render: (row) => row.actor?.name ?? "Hệ thống" },
                  { key: "action", title: "Hành động", render: (row) => <Text className="font-semibold text-brand">{AUDIT_ACTION_LABEL[row.action] ?? row.action}</Text> },
                  { key: "entity", title: "Đối tượng", width: 180, render: (row) => `${row.entity} #${row.entityId}` },
                  { key: "diff", title: "Trước → Sau", width: 320, render: (row) => (open === row.id ? <Diff log={row} /> : <Text className="text-xs text-brand-light">Chạm để xem</Text>) },
                ]}
              />
              <Pager meta={data.meta} onChange={setPage} />
            </>
          )}
        </QueryState>
      </View>
    </Screen>
  );
}

// Bảng 2 cột trước / sau cho từng trường.
function Diff({ log }: { log: AuditLog }) {
  const keys = [...new Set([...Object.keys(log.before ?? {}), ...Object.keys(log.after ?? {})])];
  const show = (value: unknown) => (value === undefined || value === null ? "—" : typeof value === "object" ? JSON.stringify(value) : String(value));
  if (keys.length === 0) return <Text className="text-xs text-muted">Không có chi tiết</Text>;
  return (
    <View className="mt-1 rounded-lg bg-surface p-2">
      {keys.map((key) => (
        <View key={key} className="flex-row gap-2 py-0.5">
          <Text className="w-28 text-xs font-semibold text-muted">{key}</Text>
          <Text className="flex-1 text-xs text-muted" numberOfLines={3}>
            {show(log.before?.[key])}
          </Text>
          <Text className="flex-1 text-xs text-brand" numberOfLines={3}>
            {show(log.after?.[key])}
          </Text>
        </View>
      ))}
    </View>
  );
}
