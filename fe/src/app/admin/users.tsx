import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { DataTable, Pager } from "@/components/layout/data-table";
import { Avatar } from "@/components/ui/avatar";
import { Badge, BookingStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/ui/card";
import { Chip, ChipRow } from "@/components/ui/choice";
import { Dialog, useDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { QueryState } from "@/components/ui/state-view";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserActions, useUserBookings, useUsers } from "@/services/admin.service";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "@/store/toast-store";
import type { Role, User } from "@/types/api";
import { formatDate, formatVnd, ROLE_LABEL } from "@/utils/format";

const ROLES: (Role | undefined)[] = [undefined, "USER", "OWNER", "STAFF", "ADMIN"];

// M11 – Người dùng: Staff chỉ xem; Admin khóa/mở, đổi vai trò (không áp cho OWNER, không tự đổi mình).
export default function UsersScreen() {
  const me = useAuthStore((state) => state.user);
  const [q, setQ] = useState("");
  const [role, setRole] = useState<Role | undefined>();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<User | null>(null);
  const debounced = useDebounce(q.trim(), 400);
  const users = useUsers({ q: debounced || undefined, role, page });
  const actions = useUserActions();
  const lock = useDialog<User>();
  const changeRole = useDialog<User>();
  const isAdmin = me?.role === "ADMIN";

  const status = (row: User) => <Badge label={row.status === "ACTIVE" ? "Hoạt động" : "Đã khóa"} tone={row.status === "ACTIVE" ? "green" : "red"} />;

  return (
    <Screen title="Người dùng">
      <View className="gap-3">
        <Input left="search" placeholder="Tìm theo tên, email, SĐT" value={q} onChangeText={(text) => { setQ(text); setPage(1); }} />
        <ChipRow>
          {ROLES.map((item) => (
            <Chip key={item ?? "all"} label={item ? ROLE_LABEL[item] : "Tất cả"} active={role === item} onPress={() => { setRole(item); setPage(1); }} />
          ))}
        </ChipRow>
        <QueryState query={users} empty={(data) => (data.data.length === 0 ? { message: "Không tìm thấy người dùng", icon: "people-outline" } : null)}>
          {(data) => (
            <>
              <DataTable
                rows={data.data}
                keyOf={(row) => row.id}
                onPress={(row) => setSelected(selected?.id === row.id ? null : row)}
                renderCard={(row) => (
                  <Card className="flex-row items-center gap-3">
                    <Avatar name={row.name} url={row.avatarUrl} />
                    <View className="flex-1">
                      <Text className="font-bold text-brand">{row.name}</Text>
                      <Text className="text-xs text-muted">{`${row.email}${row.phone ? ` · ${row.phone}` : ""}`}</Text>
                      <Text className="text-xs text-muted">{ROLE_LABEL[row.role]}</Text>
                    </View>
                    {status(row)}
                  </Card>
                )}
                columns={[
                  { key: "name", title: "Tên", render: (row) => <Text className="font-semibold text-brand">{row.name}</Text> },
                  { key: "email", title: "Email", render: (row) => row.email },
                  { key: "phone", title: "SĐT", width: 120, render: (row) => row.phone ?? "—" },
                  { key: "role", title: "Vai trò", width: 140, render: (row) => ROLE_LABEL[row.role] },
                  { key: "status", title: "Trạng thái", width: 110, render: status },
                  { key: "created", title: "Ngày tạo", width: 110, render: (row) => formatDate(row.createdAt) },
                ]}
              />
              <Pager meta={data.meta} onChange={setPage} />
            </>
          )}
        </QueryState>

        {selected ? (
          <Card className="gap-3">
            <View className="flex-row flex-wrap items-center gap-2">
              <View className="flex-1">
                <SectionTitle title={selected.name} />
                <Text className="text-sm text-muted">{`${selected.email} · ${ROLE_LABEL[selected.role]}`}</Text>
              </View>
              {isAdmin && selected.id !== me?.id ? (
                <>
                  {selected.role !== "OWNER" ? <Button title="Đổi vai trò" size="sm" variant="outline" onPress={() => changeRole.open(selected)} /> : null}
                  <Button title={selected.status === "ACTIVE" ? "Khóa" : "Mở khóa"} size="sm" variant={selected.status === "ACTIVE" ? "danger" : "secondary"} onPress={() => lock.open(selected)} />
                </>
              ) : null}
            </View>
            <UserBookings userId={selected.id} />
          </Card>
        ) : null}
      </View>

      <Dialog
        open={lock.isOpen}
        onClose={lock.close}
        title={lock.target?.status === "ACTIVE" ? `Khóa ${lock.target?.name}?` : `Mở khóa ${lock.target?.name}?`}
        message={lock.target?.status === "ACTIVE" ? "Khóa có hiệu lực ngay, mọi phiên đăng nhập của người này bị thu hồi." : undefined}
        destructive={lock.target?.status === "ACTIVE"}
        onConfirm={async () => {
          const target = lock.target;
          if (!target) return;
          await actions.setStatus.mutateAsync({ id: target.id, status: target.status === "ACTIVE" ? "LOCKED" : "ACTIVE" });
          setSelected({ ...target, status: target.status === "ACTIVE" ? "LOCKED" : "ACTIVE" });
          toast.success("Đã cập nhật trạng thái");
        }}
      />
      <Dialog open={changeRole.isOpen} onClose={changeRole.close} title={`Đổi vai trò của ${changeRole.target?.name}`} message="Vai trò Chủ địa điểm chỉ được cấp qua duyệt hồ sơ đối tác.">
        <View className="flex-row flex-wrap gap-2">
          {(["USER", "STAFF", "ADMIN"] as const).map((item) => (
            <Chip
              key={item}
              label={ROLE_LABEL[item]}
              active={changeRole.target?.role === item}
              onPress={async () => {
                const target = changeRole.target;
                if (!target) return;
                try {
                  await actions.setRole.mutateAsync({ id: target.id, role: item });
                  setSelected({ ...target, role: item });
                  toast.success("Đã đổi vai trò");
                  changeRole.close();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Không đổi được vai trò");
                }
              }}
            />
          ))}
        </View>
      </Dialog>
    </Screen>
  );
}

function UserBookings({ userId }: { userId: number }) {
  const bookings = useUserBookings(userId);
  return (
    <QueryState query={bookings} compact empty={(data) => (data.data.length === 0 ? { message: "Chưa có booking" } : null)}>
      {(data) => (
        <View className="gap-1">
          <Text className="text-sm font-semibold text-muted">{`Lịch sử đặt (${data.meta.total})`}</Text>
          {data.data.map((booking) => (
            <View key={booking.id} className="flex-row items-center gap-2 border-b border-line py-2">
              <Text className="w-36 font-mono text-xs text-brand" onPress={() => router.push(`/admin/bookings/${booking.id}`)}>
                {booking.code}
              </Text>
              <Text className="flex-1 text-sm text-brand" numberOfLines={1}>
                {booking.destination.name}
              </Text>
              <Text className="text-sm text-muted">{formatVnd(booking.totalAmount)}</Text>
              <BookingStatusBadge booking={booking} />
            </View>
          ))}
        </View>
      )}
    </QueryState>
  );
}
