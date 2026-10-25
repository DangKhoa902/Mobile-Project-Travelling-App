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
import { useDebounce } from "@/hooks/use-debounce";
import { errorMessage } from "@/services/api/client";
import { manageService, useManagedDestinations, useManageMutation } from "@/services/manage.service";
import { toast } from "@/store/toast-store";
import type { ListingStatus, ManagedDestination } from "@/types/api";
import { formatVnd, LISTING_STATUS_LABEL } from "@/utils/format";

const STATUSES: (ListingStatus | undefined)[] = [undefined, "APPROVED", "PENDING_REVIEW", "DRAFT", "REJECTED"];

// M7 – Danh sách địa điểm (ADMIN): bật/tắt Nổi bật, Hoạt động; thêm / sửa → M8.
export default function AdminDestinations() {
  const [status, setStatus] = useState<ListingStatus | undefined>();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounce(q.trim(), 400);
  const list = useManagedDestinations({ listingStatus: status, q: debounced || undefined, page });
  const patch = useManageMutation(({ id, ...input }: { id: number; isActive?: boolean; isFeatured?: boolean }) => manageService.updateDestination(id, input));

  const flip = (row: ManagedDestination, key: "isActive" | "isFeatured") => (value: boolean) =>
    patch.mutate({ id: row.id, [key]: value }, { onSuccess: () => toast.success("Đã cập nhật"), onError: (error) => toast.error(errorMessage(error)) });

  return (
    <Screen title="Địa điểm" right={<Button title="Thêm địa điểm" size="sm" icon="add" onPress={() => router.push("/admin/destinations/new")} />}>
      <View className="gap-3">
        <ChipRow>
          {STATUSES.map((item) => (
            <Chip key={item ?? "all"} label={item ? LISTING_STATUS_LABEL[item] : "Tất cả"} active={status === item} onPress={() => { setStatus(item); setPage(1); }} />
          ))}
        </ChipRow>
        <Input left="search" placeholder="Tìm theo tên, khu vực" value={q} onChangeText={setQ} />
        <QueryState query={list} empty={(data) => (data.data.length === 0 ? { message: "Không có địa điểm", icon: "map-outline" } : null)}>
          {(data) => (
            <>
              <DataTable
                rows={data.data}
                keyOf={(row) => row.id}
                onPress={(row) => router.push(`/admin/destinations/${row.id}`)}
                renderCard={(row) => (
                  <Card className="gap-2">
                    <View className="flex-row items-center justify-between gap-2">
                      <Text className="flex-1 font-bold text-brand" numberOfLines={1}>
                        {row.name}
                      </Text>
                      <ListingBadge status={row.listingStatus} />
                    </View>
                    <Text className="text-xs text-muted">{`${row.location} · ${row.owner?.partnerProfile?.businessName ?? "Sàn tự quản lý"} · từ ${formatVnd(row.minPrice)}`}</Text>
                    <Toggle label="Nổi bật" value={row.isFeatured} onChange={flip(row, "isFeatured")} />
                    <Toggle label="Hoạt động" value={row.isActive} onChange={flip(row, "isActive")} />
                  </Card>
                )}
                columns={[
                  { key: "name", title: "Tên", render: (row) => <Text className="font-semibold text-brand">{row.name}</Text> },
                  { key: "location", title: "Khu vực", width: 120, render: (row) => row.location },
                  { key: "category", title: "Danh mục", width: 110, render: (row) => row.category?.name ?? "—" },
                  { key: "owner", title: "Chủ địa điểm", width: 180, render: (row) => row.owner?.partnerProfile?.businessName ?? "Sàn" },
                  { key: "price", title: "Giá từ", width: 110, align: "right", render: (row) => formatVnd(row.minPrice) },
                  { key: "rating", title: "Đánh giá", width: 80, align: "right", render: (row) => `★ ${row.averageRating.toFixed(1)}` },
                  { key: "status", title: "Duyệt", width: 120, render: (row) => <ListingBadge status={row.listingStatus} /> },
                  { key: "featured", title: "Nổi bật", width: 90, render: (row) => <Toggle value={row.isFeatured} onChange={flip(row, "isFeatured")} /> },
                  { key: "active", title: "Hoạt động", width: 90, render: (row) => <Toggle value={row.isActive} onChange={flip(row, "isActive")} /> },
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
