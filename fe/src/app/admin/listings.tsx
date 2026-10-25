import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card, InfoRow, SectionTitle } from "@/components/ui/card";
import { Dialog, useDialog } from "@/components/ui/dialog";
import { Screen } from "@/components/ui/screen";
import { QueryState, StateView } from "@/components/ui/state-view";
import { Colors } from "@/constants/theme";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { manageService, useManagedDestination, useManagedDestinations, useManageMutation } from "@/services/manage.service";
import { toast } from "@/store/toast-store";
import { formatDateTime, formatVnd, PRICING_UNIT_LABEL } from "@/utils/format";

const CHECKLIST = ["Ảnh thật, rõ ràng", "Mô tả đúng sự thật", "Giá hợp lý", "Địa chỉ có trên bản đồ", "Chính sách hủy rõ ràng"];
const REASONS = ["Thiếu ảnh", "Sai địa chỉ", "Giá bất thường", "Nội dung không phù hợp"];

// M13 – Duyệt tin đăng (ADMIN): tin PENDING_REVIEW cũ nhất trước, xem trước + checklist, Duyệt / Từ chối.
export default function ListingReviewScreen() {
  const list = useManagedDestinations({ listingStatus: "PENDING_REVIEW" });
  const [selected, setSelected] = useState<number | null>(null);
  const { isLg } = useBreakpoint();
  const rows = [...(list.data?.data ?? [])].sort((a, b) => (a.submittedAt ?? "").localeCompare(b.submittedAt ?? ""));

  const queue = (
    <QueryState query={list} empty={(data) => (data.data.length === 0 ? { message: "Không có tin nào chờ duyệt", icon: "checkmark-done-outline" } : null)}>
      {() => (
        <View className="gap-2">
          {rows.map((row) => (
            <Pressable key={row.id} onPress={() => setSelected(row.id)} className={`flex-row gap-3 rounded-2xl border p-3 ${selected === row.id ? "border-brand bg-brand-soft" : "border-line bg-surface-card"}`}>
              <Image source={row.imageUrl ?? undefined} style={{ width: 56, height: 56, borderRadius: 10, backgroundColor: Colors.brandSoft }} />
              <View className="flex-1">
                <Text className="font-bold text-brand" numberOfLines={1}>
                  {row.name}
                </Text>
                <Text className="text-xs text-muted">{row.owner?.partnerProfile?.businessName ?? row.owner?.name ?? "—"}</Text>
                <Text className="text-xs text-muted">{`Gửi ${row.submittedAt ? formatDateTime(row.submittedAt) : "—"} · ${row._count.roomTypes} phòng · ${row._count.packages} gói`}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </QueryState>
  );

  if (isLg) {
    return (
      <Screen title="Duyệt tin đăng" scroll={false}>
        <View className="flex-1 flex-row gap-4">
          <ScrollView className="w-96 flex-none">{queue}</ScrollView>
          <ScrollView className="flex-1">{selected ? <ListingPreview id={selected} onDone={() => setSelected(null)} /> : <StateView kind="empty" icon="hand-left-outline" message="Chọn một tin để xem trước" />}</ScrollView>
        </View>
      </Screen>
    );
  }
  return (
    <Screen title="Duyệt tin đăng">
      <View className="gap-4">
        {queue}
        {selected ? <ListingPreview id={selected} onDone={() => setSelected(null)} /> : null}
      </View>
    </Screen>
  );
}

function ListingPreview({ id, onDone }: { id: number; onDone: () => void }) {
  const detail = useManagedDestination(id);
  const review = useManageMutation(({ status, rejectReason }: { status: "APPROVED" | "REJECTED"; rejectReason?: string }) => manageService.reviewListing(id, status, rejectReason));
  const approve = useDialog();
  const reject = useDialog();

  return (
    <QueryState query={detail}>
      {(data) => (
        <View className="gap-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
            {(data.images.length ? data.images.map((image) => image.url) : data.imageUrl ? [data.imageUrl] : []).map((url) => (
              <Image key={url} source={url} style={{ width: 220, height: 140, borderRadius: 12, backgroundColor: Colors.brandSoft }} contentFit="cover" />
            ))}
          </ScrollView>
          <Card className="gap-1">
            <SectionTitle title={data.name} />
            <Text className="text-sm text-muted">{`${data.category?.name ?? "—"} · ${data.location} · Chủ: ${data.owner?.partnerProfile?.businessName ?? data.owner?.name ?? "—"}`}</Text>
            <InfoRow label="Địa chỉ" value={data.address ?? "—"} />
            <InfoRow label="Tọa độ" value={data.latitude && data.longitude ? `${data.latitude}, ${data.longitude}` : "—"} />
            <InfoRow label="Liên hệ" value={[data.contactPhone, data.contactEmail].filter(Boolean).join(" · ") || "—"} />
            {data.description ? <Text className="mt-2 text-brand">{data.description}</Text> : null}
            {data.policy ? <Text className="mt-2 text-sm text-muted">{`Chính sách: ${data.policy}`}</Text> : null}
          </Card>
          <Card className="gap-1">
            <SectionTitle title="Phòng · Gói · Dịch vụ" className="mb-1" />
            {data.roomTypes.map((room) => (
              <InfoRow key={`r${room.id}`} label={`Phòng ${room.name} (${room.capacity} khách, ${room.totalRooms} phòng)`} value={`${formatVnd(room.pricePerNight)}/đêm`} />
            ))}
            {data.packages.map((pkg) => (
              <InfoRow key={`p${pkg.id}`} label={`Gói ${pkg.name} (${pkg.durationDays}N${pkg.durationNights}Đ, hủy trước ${pkg.freeCancellationHours}h)`} value={formatVnd(pkg.price)} />
            ))}
            {data.services.map((service) => (
              <InfoRow key={`s${service.id}`} label={`Dịch vụ ${service.name}`} value={`${formatVnd(service.price)}${PRICING_UNIT_LABEL[service.pricingUnit]}`} />
            ))}
          </Card>
          <Card className="gap-2">
            <SectionTitle title="Checklist người duyệt" />
            {CHECKLIST.map((item) => (
              <View key={item} className="flex-row items-center gap-2">
                <Ionicons name="ellipse-outline" size={14} color={Colors.muted} />
                <Text className="text-brand">{item}</Text>
              </View>
            ))}
          </Card>
          <View className="flex-row flex-wrap justify-end gap-2">
            <Button title="Mở trang xem trước" variant="ghost" icon="open-outline" onPress={() => router.push(`/destinations/${data.slug}`)} />
            <Button title="Từ chối" variant="outline" onPress={() => reject.open(true)} />
            <Button title="Duyệt" icon="checkmark" onPress={() => approve.open(true)} />
          </View>
          <Dialog
            open={approve.isOpen}
            onClose={approve.close}
            title="Duyệt tin đăng?"
            message="Tin sẽ hiển thị công khai cho khách."
            confirmLabel="Duyệt"
            onConfirm={async () => {
              await review.mutateAsync({ status: "APPROVED" });
              toast.success("Đã duyệt tin");
              onDone();
            }}
          />
          <Dialog
            open={reject.isOpen}
            onClose={reject.close}
            title="Từ chối tin đăng?"
            input={{ label: "Lý do từ chối", required: true, minLength: 3, suggestions: REASONS }}
            confirmLabel="Từ chối"
            destructive
            onConfirm={async (reason) => {
              await review.mutateAsync({ status: "REJECTED", rejectReason: reason });
              toast.success("Đã từ chối tin");
              onDone();
            }}
          />
        </View>
      )}
    </QueryState>
  );
}
