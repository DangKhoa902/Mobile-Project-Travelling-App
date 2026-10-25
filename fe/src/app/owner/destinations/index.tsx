import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { DataTable, Pager } from "@/components/layout/data-table";
import { ListingBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip, ChipRow, Toggle } from "@/components/ui/choice";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { QueryState } from "@/components/ui/state-view";
import { Colors } from "@/constants/theme";
import { useDebounce } from "@/hooks/use-debounce";
import { errorMessage } from "@/services/api/client";
import { manageService, useManagedDestinations, useManageMutation } from "@/services/manage.service";
import { toast } from "@/store/toast-store";
import type { ListingStatus, ManagedDestination } from "@/types/api";
import { LISTING_STATUS_LABEL } from "@/utils/format";

const STATUSES: (ListingStatus | undefined)[] = [undefined, "DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED"];

// O2 – Tin đăng của tôi: badge duyệt, công tắc nhận khách; chạm → O3 (nháp/từ chối) hoặc O4 (đã duyệt/chờ duyệt).
export default function OwnerDestinations() {
  const [status, setStatus] = useState<ListingStatus | undefined>();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounce(q.trim(), 400);
  const list = useManagedDestinations({ listingStatus: status, q: debounced || undefined, page });
  const toggle = useManageMutation(({ id, isActive }: { id: number; isActive: boolean }) => manageService.updateDestination(id, { isActive }));

  const open = (row: ManagedDestination) =>
    router.push((row.listingStatus === "DRAFT" || row.listingStatus === "REJECTED" ? `/owner/destinations/${row.id}` : `/owner/destinations/${row.id}/status`) as never);

  const activeSwitch = (row: ManagedDestination) => (
    <Toggle
      value={row.isActive}
      onChange={(isActive) => toggle.mutate({ id: row.id, isActive }, { onSuccess: () => toast.success(isActive ? "Đã bật nhận khách" : "Đã tạm ngừng nhận khách"), onError: (error) => toast.error(errorMessage(error)) })}
    />
  );

  return (
    <Screen title="Tin đăng của tôi" right={<Button title="Đăng địa điểm mới" size="sm" icon="add" onPress={() => router.push("/owner/destinations/new")} />}>
      <View className="gap-3">
        <ChipRow>
          {STATUSES.map((item) => (
            <Chip key={item ?? "all"} label={item ? LISTING_STATUS_LABEL[item] : "Tất cả"} active={status === item} onPress={() => { setStatus(item); setPage(1); }} />
          ))}
        </ChipRow>
        <Input left="search" placeholder="Tìm theo tên" value={q} onChangeText={setQ} />
        <QueryState
          query={list}
          empty={(data) => (data.data.length === 0 ? { message: "Chưa có tin đăng", icon: "home-outline", action: { label: "Đăng địa điểm đầu tiên", onPress: () => router.push("/owner/destinations/new") } } : null)}>
          {(data) => (
            <>
              <DataTable
                rows={data.data}
                keyOf={(row) => row.id}
                onPress={open}
                renderCard={(row) => (
                  <Card className="flex-row gap-3">
                    <Image source={row.imageUrl ?? undefined} style={{ width: 72, height: 72, borderRadius: 12, backgroundColor: Colors.brandSoft }} />
                    <View className="flex-1 gap-1">
                      <Text className="font-bold text-brand" numberOfLines={1}>
                        {row.name}
                      </Text>
                      <Text className="text-xs text-muted">{`${row.location} · ${row._count.bookings} booking · ★ ${row.averageRating.toFixed(1)}`}</Text>
                      <ListingBadge status={row.listingStatus} />
                    </View>
                    {activeSwitch(row)}
                  </Card>
                )}
                columns={[
                  {
                    key: "name",
                    title: "Địa điểm",
                    render: (row) => (
                      <View className="flex-row items-center gap-2">
                        <Image source={row.imageUrl ?? undefined} style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: Colors.brandSoft }} />
                        <Text className="flex-1 font-semibold text-brand" numberOfLines={1}>
                          {row.name}
                        </Text>
                      </View>
                    ),
                  },
                  { key: "location", title: "Khu vực", width: 130, render: (row) => row.location },
                  { key: "status", title: "Trạng thái", width: 130, render: (row) => <ListingBadge status={row.listingStatus} /> },
                  { key: "bookings", title: "Booking", width: 90, align: "right", render: (row) => String(row._count.bookings) },
                  { key: "rating", title: "Đánh giá", width: 90, align: "right", render: (row) => `★ ${row.averageRating.toFixed(1)}` },
                  { key: "active", title: "Nhận khách", width: 110, render: activeSwitch },
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
