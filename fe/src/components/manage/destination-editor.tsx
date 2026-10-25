import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";

import { ListingBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Banner, Card, SectionTitle } from "@/components/ui/card";
import { Chip, Segmented, Toggle } from "@/components/ui/choice";
import { DateField } from "@/components/ui/date-field";
import { Dialog } from "@/components/ui/dialog";
import { ImageUploader } from "@/components/ui/image-uploader";
import { Input, toInt } from "@/components/ui/input";
import { QueryState } from "@/components/ui/state-view";
import { Colors } from "@/constants/theme";
import { ApiError, errorMessage, fieldErrors } from "@/services/api/client";
import { useCategories, useFacilities } from "@/services/destination.service";
import { manageService, useManagedDestination, useManageMutation, useRoomRates, type DestinationInput } from "@/services/manage.service";
import { usePartners } from "@/services/partner.service";
import { toast } from "@/store/toast-store";
import type { AddonService, ManagedDestinationDetail, PricingUnit, RoomRate, RoomType, TravelPackage } from "@/types/api";
import { formatDate, formatVnd, PRICING_UNIT_LABEL } from "@/utils/format";

type Mode = "owner" | "admin";
type Tab = "info" | "rooms" | "packages" | "services";

// O3 (chủ địa điểm) / M8 (admin): tạo / sửa tin – 4 tab Thông tin · Phòng · Gói · Dịch vụ.
// Chủ tạo tin → DRAFT, "Gửi duyệt" để admin duyệt; admin tạo → duyệt sẵn, có thêm Chủ địa điểm và Nổi bật.
export function DestinationEditor({ id, mode }: { id: number | null; mode: Mode }) {
  const detail = useManagedDestination(id);
  const [tab, setTab] = useState<Tab>("info");

  if (!id) return <InfoForm destination={null} mode={mode} />;

  return (
    <QueryState query={detail}>
      {(destination) => (
        <View className="gap-4">
          <EditorHeader destination={destination} mode={mode} />
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: "info", label: "Thông tin" },
              { value: "rooms", label: `Phòng (${destination.roomTypes.length})` },
              { value: "packages", label: `Gói (${destination.packages.length})` },
              { value: "services", label: `Dịch vụ (${destination.services.length})` },
            ]}
          />
          {tab === "info" ? <InfoForm destination={destination} mode={mode} /> : null}
          {tab === "rooms" ? <RoomsTab destination={destination} /> : null}
          {tab === "packages" ? <PackagesTab destination={destination} /> : null}
          {tab === "services" ? <ServicesTab destination={destination} /> : null}
        </View>
      )}
    </QueryState>
  );
}

function EditorHeader({ destination, mode }: { destination: ManagedDestinationDetail; mode: Mode }) {
  const submit = useManageMutation(manageService.submit);
  const [checklist, setChecklist] = useState(false);
  const checks = [
    { label: "Có ít nhất 1 loại phòng đang bán", ok: destination.roomTypes.some((room) => room.isActive) },
    { label: "Có ít nhất 1 gói đang bán", ok: destination.packages.some((pkg) => pkg.isActive) },
    { label: "Có ảnh", ok: destination.images.length > 0 || Boolean(destination.imageUrl) },
    { label: "Có mô tả", ok: Boolean(destination.description?.trim()) },
  ];
  const canSubmit = mode === "owner" && (destination.listingStatus === "DRAFT" || destination.listingStatus === "REJECTED");

  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap items-center gap-2">
        <ListingBadge status={destination.listingStatus} />
        {destination.owner ? <Text className="text-sm text-muted">{`Chủ: ${destination.owner.partnerProfile?.businessName ?? destination.owner.name}`}</Text> : null}
        <View className="flex-1" />
        <Button title="Xem trước" size="sm" variant="outline" icon="eye-outline" onPress={() => router.push(`/destinations/${destination.slug}`)} />
        {canSubmit ? <Button title="Gửi duyệt" size="sm" icon="send-outline" onPress={() => setChecklist(true)} /> : null}
      </View>
      {destination.listingStatus === "REJECTED" && destination.listingRejectReason ? (
        <Banner tone="danger" title="Tin bị từ chối">{`${destination.listingRejectReason}. Sửa theo góp ý rồi gửi duyệt lại.`}</Banner>
      ) : null}
      {destination.listingStatus === "PENDING_REVIEW" ? <Banner tone="warning">Tin đang chờ quản trị viên duyệt.</Banner> : null}
      <Dialog
        open={checklist}
        onClose={() => setChecklist(false)}
        title="Gửi tin đi duyệt?"
        confirmLabel="Gửi duyệt"
        onConfirm={async () => {
          await submit.mutateAsync(destination.id);
          toast.success("Đã gửi tin đi duyệt");
        }}>
        <View className="gap-2">
          {checks.map((check) => (
            <View key={check.label} className="flex-row items-center gap-2">
              <Ionicons name={check.ok ? "checkmark-circle" : "close-circle"} size={18} color={check.ok ? Colors.brandLight : Colors.danger} />
              <Text className="text-brand">{check.label}</Text>
            </View>
          ))}
          <Text className="text-xs text-muted">Thiếu phòng hoặc gói, hệ thống sẽ từ chối gửi (LISTING_INCOMPLETE).</Text>
        </View>
      </Dialog>
    </View>
  );
}

// ---------- Tab Thông tin ----------

function InfoForm({ destination, mode }: { destination: ManagedDestinationDetail | null; mode: Mode }) {
  const categories = useCategories();
  const facilities = useFacilities();
  const partners = usePartners({ status: "APPROVED" });
  const save = useManageMutation(({ id, input }: { id: number | null; input: DestinationInput }) =>
    id ? manageService.updateDestination(id, input) : manageService.createDestination(input),
  );
  const remove = useManageMutation(manageService.removeDestination);
  const [form, setForm] = useState(() => initialInfo(destination));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const base = mode === "owner" ? "/owner/destinations" : "/admin/destinations";

  const [formFor, setFormFor] = useState(destination?.id ?? null);
  if ((destination?.id ?? null) !== formFor) {
    setFormFor(destination?.id ?? null);
    setForm(initialInfo(destination));
  }

  const set = <K extends keyof InfoState>(key: K) => (value: InfoState[K]) => setForm((current) => ({ ...current, [key]: value }));

  async function submit() {
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = "Nhập tên địa điểm";
    if (form.location.trim().length < 2) next.location = "Nhập khu vực";
    setErrors(next);
    if (Object.keys(next).length) return;
    setError(null);
    const input: DestinationInput = {
      name: form.name.trim(),
      location: form.location.trim(),
      address: form.address.trim() || null,
      description: form.description.trim() || null,
      policy: form.policy.trim() || null,
      contactPhone: form.contactPhone.trim() || null,
      contactEmail: form.contactEmail.trim() || null,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
      categoryId: form.categoryId,
      facilityIds: form.facilityIds,
      images: form.images,
      imageUrl: form.images[0] ?? null,
      isActive: form.isActive,
      ...(mode === "admin" ? { isFeatured: form.isFeatured, ownerId: form.ownerId } : {}),
    };
    try {
      const saved = await save.mutateAsync({ id: destination?.id ?? null, input });
      toast.success(destination ? "Đã lưu thông tin" : "Đã tạo tin – tiếp tục thêm phòng và gói");
      if (!destination) router.replace(`${base}/${saved.id}` as never);
    } catch (caught) {
      const byField = fieldErrors(caught);
      if (Object.keys(byField).length) setErrors(byField);
      else setError(errorMessage(caught));
    }
  }

  return (
    <View className="gap-4">
      {!destination ? <Banner tone="info">{mode === "owner" ? "Bước 1: lưu thông tin để tạo tin nháp, sau đó thêm phòng, gói, dịch vụ và gửi duyệt." : "Địa điểm do quản trị viên tạo được duyệt sẵn."}</Banner> : null}
      {error ? <Banner tone="danger">{error}</Banner> : null}
      <Card className="gap-4">
        <SectionTitle title="Thông tin chung" />
        <Input label="Tên địa điểm" required value={form.name} onChangeText={set("name")} error={errors.name} />
        <Input label="Khu vực" required value={form.location} onChangeText={set("location")} error={errors.location} placeholder="Đà Lạt" />
        <View className="gap-2">
          <Text className="text-sm font-medium text-brand">Danh mục</Text>
          <View className="flex-row flex-wrap gap-2">
            {categories.data?.map((category) => (
              <Chip key={category.id} label={category.name} active={form.categoryId === category.id} onPress={() => set("categoryId")(form.categoryId === category.id ? null : category.id)} />
            ))}
          </View>
        </View>
        <Input label="Mô tả" multiline maxLength={10000} value={form.description} onChangeText={set("description")} error={errors.description} />
        <Input label="Chính sách" multiline value={form.policy} onChangeText={set("policy")} placeholder="Giờ nhận/trả phòng, hút thuốc, thú cưng..." />
      </Card>

      <Card className="gap-4">
        <SectionTitle title="Ảnh" />
        <ImageUploader value={form.images} onChange={set("images")} purpose="destination" max={20} reorder label="Ảnh địa điểm (ảnh đầu là ảnh bìa)" />
      </Card>

      <Card className="gap-4">
        <SectionTitle title="Vị trí & liên hệ" />
        <Input label="Địa chỉ" value={form.address} onChangeText={set("address")} />
        <View className="flex-row gap-2">
          <Input className="flex-1" label="Vĩ độ" keyboardType="decimal-pad" value={form.latitude} onChangeText={set("latitude")} error={errors.latitude} placeholder="11.94" />
          <Input className="flex-1" label="Kinh độ" keyboardType="decimal-pad" value={form.longitude} onChangeText={set("longitude")} error={errors.longitude} placeholder="108.45" />
        </View>
        <Input label="SĐT liên hệ" keyboardType="phone-pad" value={form.contactPhone} onChangeText={set("contactPhone")} error={errors.contactPhone} />
        <Input label="Email liên hệ" keyboardType="email-address" autoCapitalize="none" value={form.contactEmail} onChangeText={set("contactEmail")} error={errors.contactEmail} />
      </Card>

      <Card className="gap-3">
        <SectionTitle title="Tiện ích" />
        <View className="flex-row flex-wrap gap-2">
          {facilities.data?.map((facility) => {
            const active = form.facilityIds.includes(facility.id);
            return (
              <Chip
                key={facility.id}
                label={facility.name}
                active={active}
                icon={active ? "checkmark" : undefined}
                onPress={() => set("facilityIds")(active ? form.facilityIds.filter((item) => item !== facility.id) : [...form.facilityIds, facility.id])}
              />
            );
          })}
        </View>
      </Card>

      <Card className="gap-2">
        <Toggle label="Đang nhận khách" value={form.isActive} onChange={set("isActive")} />
        {mode === "admin" ? (
          <>
            <Toggle label="Nổi bật trên trang chủ" value={form.isFeatured} onChange={set("isFeatured")} />
            <Text className="text-sm font-medium text-brand">Chủ địa điểm</Text>
            <View className="flex-row flex-wrap gap-2">
              <Chip label="Sàn tự quản lý" active={form.ownerId === null} onPress={() => set("ownerId")(null)} />
              {partners.data?.data.map((partner) => (
                <Chip key={partner.userId} label={partner.businessName} active={form.ownerId === partner.userId} onPress={() => set("ownerId")(partner.userId)} />
              ))}
            </View>
          </>
        ) : null}
      </Card>

      <View className="flex-row flex-wrap justify-end gap-2">
        {destination && (mode === "admin" || destination.listingStatus !== "APPROVED") ? (
          <Button title="Xóa tin" variant="ghost" icon="trash-outline" onPress={() => setConfirmDelete(true)} />
        ) : null}
        <Button title={destination ? "Lưu thông tin" : mode === "owner" ? "Lưu nháp" : "Tạo địa điểm"} icon="save-outline" loading={save.isPending} onPress={submit} />
      </View>

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Xóa địa điểm?"
        message="Địa điểm đã có booking không xóa được – hãy tắt 'Đang nhận khách' thay vì xóa."
        confirmLabel="Xóa"
        destructive
        onConfirm={async () => {
          if (!destination) return;
          await remove.mutateAsync(destination.id);
          toast.success("Đã xóa địa điểm");
          router.replace(base as never);
        }}
      />
    </View>
  );
}

type InfoState = ReturnType<typeof initialInfo>;

function initialInfo(destination: ManagedDestinationDetail | null) {
  return {
    name: destination?.name ?? "",
    location: destination?.location ?? "",
    address: destination?.address ?? "",
    description: destination?.description ?? "",
    policy: destination?.policy ?? "",
    contactPhone: destination?.contactPhone ?? "",
    contactEmail: destination?.contactEmail ?? "",
    latitude: destination?.latitude != null ? String(destination.latitude) : "",
    longitude: destination?.longitude != null ? String(destination.longitude) : "",
    categoryId: destination?.categoryId ?? null,
    facilityIds: destination?.facilities.map((facility) => facility.id) ?? [],
    images: destination?.images.length ? destination.images.map((image) => image.url) : destination?.imageUrl ? [destination.imageUrl] : [],
    isActive: destination?.isActive ?? true,
    isFeatured: destination?.isFeatured ?? false,
    ownerId: destination?.ownerId ?? null,
  };
}

// ---------- Khung chung cho phòng / gói / dịch vụ ----------

function ItemCard({ title, subtitle, inactive, children, defaultOpen }: { title: string; subtitle?: string; inactive?: boolean; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  return (
    <Card className={`gap-3 ${inactive ? "opacity-70" : ""}`}>
      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <Text className="text-base font-bold text-brand">{title}</Text>
          {subtitle ? <Text className="text-sm text-muted">{subtitle}</Text> : null}
        </View>
        {inactive ? <Text className="text-xs font-semibold text-muted">Đang tắt</Text> : null}
        <Button title={open ? "Thu gọn" : "Sửa"} size="sm" variant="outline" onPress={() => setOpen(!open)} />
      </View>
      {open ? children : null}
    </Card>
  );
}

function useSaveWithErrors<T>(save: (input: T) => Promise<unknown>, success: string) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  async function run(input: T, after?: () => void) {
    setBusy(true);
    setErrors({});
    try {
      await save(input);
      toast.success(success);
      after?.();
    } catch (caught) {
      const byField = fieldErrors(caught);
      if (Object.keys(byField).length) setErrors(byField);
      else toast.error(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }
  return { errors, busy, run };
}

// ---------- Tab Phòng (kèm giá theo mùa) ----------

function RoomsTab({ destination }: { destination: ManagedDestinationDetail }) {
  const [adding, setAdding] = useState(false);
  return (
    <View className="gap-3">
      {destination.roomTypes.map((room) => (
        <ItemCard key={room.id} title={room.name} subtitle={`${formatVnd(room.pricePerNight)}/đêm · ${room.capacity} khách · ${room.totalRooms} phòng`} inactive={!room.isActive}>
          <RoomForm destinationId={destination.id} room={room} />
          <RatesEditor roomTypeId={room.id} />
        </ItemCard>
      ))}
      {adding ? (
        <Card className="gap-3">
          <SectionTitle title="Loại phòng mới" />
          <RoomForm destinationId={destination.id} room={null} onDone={() => setAdding(false)} />
        </Card>
      ) : (
        <Button title="Thêm loại phòng" icon="add" variant="secondary" onPress={() => setAdding(true)} />
      )}
    </View>
  );
}

function RoomForm({ destinationId, room, onDone }: { destinationId: number; room: RoomType | null; onDone?: () => void }) {
  const mutation = useManageMutation(({ id, input }: { id: number | null; input: Parameters<typeof manageService.saveRoomType>[1] }) => manageService.saveRoomType(id, input));
  const { errors, busy, run } = useSaveWithErrors(mutation.mutateAsync, room ? "Đã lưu loại phòng" : "Đã thêm loại phòng");
  const [form, setForm] = useState({
    name: room?.name ?? "",
    description: room?.description ?? "",
    capacity: String(room?.capacity ?? 2),
    pricePerNight: room ? String(room.pricePerNight) : "",
    totalRooms: String(room?.totalRooms ?? 1),
    isActive: room?.isActive ?? true,
  });
  return (
    <View className="gap-3">
      <Input label="Tên phòng" required value={form.name} onChangeText={(name) => setForm({ ...form, name })} error={errors.name} />
      <Input label="Mô tả" multiline value={form.description} onChangeText={(description) => setForm({ ...form, description })} />
      <View className="flex-row gap-2">
        <Input className="flex-1" label="Sức chứa" required keyboardType="number-pad" value={form.capacity} onChangeText={(capacity) => setForm({ ...form, capacity })} error={errors.capacity} />
        <Input className="flex-1" label="Tổng số phòng" required keyboardType="number-pad" value={form.totalRooms} onChangeText={(totalRooms) => setForm({ ...form, totalRooms })} error={errors.totalRooms} />
      </View>
      <Input label="Giá/đêm (VNĐ)" required keyboardType="number-pad" value={form.pricePerNight} onChangeText={(pricePerNight) => setForm({ ...form, pricePerNight })} error={errors.pricePerNight} />
      <Toggle label="Đang bán" value={form.isActive} onChange={(isActive) => setForm({ ...form, isActive })} />
      <View className="items-end">
        <Button
          title={room ? "Lưu phòng" : "Thêm phòng"}
          size="sm"
          loading={busy}
          onPress={() =>
            run(
              {
                id: room?.id ?? null,
                input: {
                  destinationId,
                  name: form.name.trim(),
                  description: form.description.trim() || null,
                  capacity: toInt(form.capacity) ?? 0,
                  pricePerNight: toInt(form.pricePerNight) ?? 0,
                  totalRooms: toInt(form.totalRooms) ?? 0,
                  isActive: form.isActive,
                },
              },
              onDone,
            )
          }
        />
      </View>
    </View>
  );
}

function RatesEditor({ roomTypeId }: { roomTypeId: number }) {
  const rates = useRoomRates(roomTypeId);
  const [editing, setEditing] = useState<RoomRate | "new" | null>(null);
  return (
    <View className="gap-2 rounded-xl bg-surface p-3">
      <View className="flex-row items-center justify-between">
        <Text className="font-semibold text-brand">Giá theo mùa</Text>
        <Button title="Thêm giá mùa" size="sm" variant="ghost" icon="add" onPress={() => setEditing("new")} />
      </View>
      {rates.data?.length === 0 && editing === null ? <Text className="text-sm text-muted">Chưa có giá mùa – mọi đêm tính theo giá gốc.</Text> : null}
      {rates.data?.map((rate) =>
        editing !== "new" && editing?.id === rate.id ? (
          <RateForm key={rate.id} roomTypeId={roomTypeId} rate={rate} onDone={() => setEditing(null)} />
        ) : (
          <View key={rate.id} className="flex-row items-center justify-between gap-2">
            <Text className="flex-1 text-sm text-brand">{`${rate.name}: ${formatVnd(rate.pricePerNight)}/đêm · ${formatDate(rate.startDate)} – ${formatDate(rate.endDate)}`}</Text>
            <Button title="Sửa" size="sm" variant="ghost" onPress={() => setEditing(rate)} />
          </View>
        ),
      )}
      {editing === "new" ? <RateForm roomTypeId={roomTypeId} rate={null} onDone={() => setEditing(null)} /> : null}
    </View>
  );
}

function RateForm({ roomTypeId, rate, onDone }: { roomTypeId: number; rate: RoomRate | null; onDone: () => void }) {
  const save = useManageMutation(({ input }: { input: Parameters<typeof manageService.saveRate>[2] }) => manageService.saveRate(roomTypeId, rate?.id ?? null, input));
  const remove = useManageMutation((rateId: number) => manageService.removeRate(roomTypeId, rateId));
  const [form, setForm] = useState({ name: rate?.name ?? "", startDate: rate?.startDate.slice(0, 10) ?? null, endDate: rate?.endDate.slice(0, 10) ?? null, price: rate ? String(rate.pricePerNight) : "" });
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!form.startDate || !form.endDate) return setError("Chọn ngày bắt đầu và kết thúc");
    setError(null);
    try {
      await save.mutateAsync({ input: { name: form.name.trim(), startDate: form.startDate, endDate: form.endDate, pricePerNight: toInt(form.price) ?? 0 } });
      toast.success("Đã lưu giá mùa");
      onDone();
    } catch (caught) {
      setError(caught instanceof ApiError && caught.code === "RATE_OVERLAP" ? "Khoảng ngày trùng với giá mùa khác" : errorMessage(caught));
    }
  }

  return (
    <View className="gap-2 rounded-xl border border-line bg-surface-card p-3">
      <Input label="Tên (ví dụ Tết, Hè)" value={form.name} onChangeText={(name) => setForm({ ...form, name })} />
      <View className="gap-2 md:flex-row">
        <View className="flex-1">
          <DateField label="Từ ngày" value={form.startDate} onChange={(startDate) => setForm({ ...form, startDate })} />
        </View>
        <View className="flex-1">
          <DateField label="Đến ngày (gồm cả ngày này)" value={form.endDate} onChange={(endDate) => setForm({ ...form, endDate })} min={form.startDate ?? undefined} />
        </View>
      </View>
      <Input label="Giá/đêm (VNĐ)" keyboardType="number-pad" value={form.price} onChangeText={(price) => setForm({ ...form, price })} />
      {error ? <Text className="text-sm text-danger">{error}</Text> : null}
      <View className="flex-row justify-end gap-2">
        {rate ? (
          <Button
            title="Xóa"
            size="sm"
            variant="ghost"
            onPress={() =>
              remove.mutate(rate.id, {
                onSuccess: () => {
                  toast.success("Đã xóa giá mùa");
                  onDone();
                },
                onError: (caught) => setError(errorMessage(caught)),
              })
            }
          />
        ) : null}
        <Button title="Hủy" size="sm" variant="outline" onPress={onDone} />
        <Button title="Lưu" size="sm" loading={save.isPending} onPress={submit} />
      </View>
    </View>
  );
}

// ---------- Tab Gói ----------

function PackagesTab({ destination }: { destination: ManagedDestinationDetail }) {
  const [adding, setAdding] = useState(false);
  return (
    <View className="gap-3">
      {destination.packages.map((pkg) => (
        <ItemCard key={pkg.id} title={pkg.name} subtitle={`${pkg.durationDays}N${pkg.durationNights}Đ · ${formatVnd(pkg.price)}`} inactive={!pkg.isActive}>
          <PackageForm destinationId={destination.id} pkg={pkg} />
        </ItemCard>
      ))}
      {adding ? (
        <Card className="gap-3">
          <SectionTitle title="Gói mới" />
          <PackageForm destinationId={destination.id} pkg={null} onDone={() => setAdding(false)} />
        </Card>
      ) : (
        <Button title="Thêm gói" icon="add" variant="secondary" onPress={() => setAdding(true)} />
      )}
    </View>
  );
}

function PackageForm({ destinationId, pkg, onDone }: { destinationId: number; pkg: TravelPackage | null; onDone?: () => void }) {
  const mutation = useManageMutation(({ id, input }: { id: number | null; input: Parameters<typeof manageService.savePackage>[1] }) => manageService.savePackage(id, input));
  const { errors, busy, run } = useSaveWithErrors(mutation.mutateAsync, pkg ? "Đã lưu gói" : "Đã thêm gói");
  const [form, setForm] = useState({
    name: pkg?.name ?? "",
    description: pkg?.description ?? "",
    inclusions: pkg?.inclusions?.join("\n") ?? "",
    durationDays: String(pkg?.durationDays ?? 2),
    durationNights: String(pkg?.durationNights ?? 1),
    price: pkg ? String(pkg.price) : "",
    freeCancellationHours: String(pkg?.freeCancellationHours ?? 48),
    isActive: pkg?.isActive ?? true,
  });
  const days = toInt(form.durationDays) ?? 0;
  const nights = toInt(form.durationNights) ?? 0;
  return (
    <View className="gap-3">
      <Input label="Tên gói" required value={form.name} onChangeText={(name) => setForm({ ...form, name })} error={errors.name} />
      <Input label="Mô tả" multiline value={form.description} onChangeText={(description) => setForm({ ...form, description })} />
      <Input label="Quyền lợi (mỗi dòng một mục)" multiline value={form.inclusions} onChangeText={(inclusions) => setForm({ ...form, inclusions })} placeholder={"Bữa sáng\nĐưa đón sân bay"} />
      <View className="flex-row gap-2">
        <Input className="flex-1" label="Số ngày" required keyboardType="number-pad" value={form.durationDays} onChangeText={(durationDays) => setForm({ ...form, durationDays })} />
        <Input
          className="flex-1"
          label="Số đêm"
          required
          keyboardType="number-pad"
          value={form.durationNights}
          onChangeText={(durationNights) => setForm({ ...form, durationNights })}
          error={nights > days ? "Số đêm không lớn hơn số ngày" : errors.durationNights}
        />
      </View>
      <View className="flex-row gap-2">
        <Input className="flex-1" label="Giá gói (VNĐ)" required keyboardType="number-pad" value={form.price} onChangeText={(price) => setForm({ ...form, price })} error={errors.price} />
        <Input className="flex-1" label="Hủy miễn phí trước (giờ)" keyboardType="number-pad" value={form.freeCancellationHours} onChangeText={(freeCancellationHours) => setForm({ ...form, freeCancellationHours })} />
      </View>
      <Toggle label="Đang bán" value={form.isActive} onChange={(isActive) => setForm({ ...form, isActive })} />
      <View className="items-end">
        <Button
          title={pkg ? "Lưu gói" : "Thêm gói"}
          size="sm"
          loading={busy}
          disabled={nights > days}
          onPress={() =>
            run(
              {
                id: pkg?.id ?? null,
                input: {
                  destinationId,
                  name: form.name.trim(),
                  description: form.description.trim() || null,
                  inclusions: form.inclusions.split("\n").map((line) => line.trim()).filter(Boolean),
                  durationDays: days,
                  durationNights: nights,
                  price: toInt(form.price) ?? 0,
                  freeCancellationHours: toInt(form.freeCancellationHours) ?? 0,
                  isActive: form.isActive,
                },
              },
              onDone,
            )
          }
        />
      </View>
    </View>
  );
}

// ---------- Tab Dịch vụ ----------

const UNITS: PricingUnit[] = ["PER_BOOKING", "PER_GUEST", "PER_NIGHT"];

function ServicesTab({ destination }: { destination: ManagedDestinationDetail }) {
  const [adding, setAdding] = useState(false);
  return (
    <View className="gap-3">
      {destination.services.map((service) => (
        <ItemCard key={service.id} title={service.name} subtitle={`${formatVnd(service.price)}${PRICING_UNIT_LABEL[service.pricingUnit]}`} inactive={!service.isActive}>
          <AddonForm destinationId={destination.id} service={service} />
        </ItemCard>
      ))}
      {adding ? (
        <Card className="gap-3">
          <SectionTitle title="Dịch vụ mới" />
          <AddonForm destinationId={destination.id} service={null} onDone={() => setAdding(false)} />
        </Card>
      ) : (
        <Button title="Thêm dịch vụ" icon="add" variant="secondary" onPress={() => setAdding(true)} />
      )}
    </View>
  );
}

function AddonForm({ destinationId, service, onDone }: { destinationId: number; service: AddonService | null; onDone?: () => void }) {
  const mutation = useManageMutation(({ id, input }: { id: number | null; input: Parameters<typeof manageService.saveAddon>[1] }) => manageService.saveAddon(id, input));
  const { errors, busy, run } = useSaveWithErrors(mutation.mutateAsync, service ? "Đã lưu dịch vụ" : "Đã thêm dịch vụ");
  const [form, setForm] = useState({
    name: service?.name ?? "",
    description: service?.description ?? "",
    price: service ? String(service.price) : "",
    pricingUnit: service?.pricingUnit ?? ("PER_BOOKING" as PricingUnit),
    isActive: service?.isActive ?? true,
  });
  return (
    <View className="gap-3">
      <Input label="Tên dịch vụ" required value={form.name} onChangeText={(name) => setForm({ ...form, name })} error={errors.name} />
      <Input label="Mô tả" multiline value={form.description} onChangeText={(description) => setForm({ ...form, description })} />
      <Input label="Giá (VNĐ)" required keyboardType="number-pad" value={form.price} onChangeText={(price) => setForm({ ...form, price })} error={errors.price} />
      <View className="flex-row flex-wrap gap-2">
        {UNITS.map((unit) => (
          <Chip key={unit} label={PRICING_UNIT_LABEL[unit]} active={form.pricingUnit === unit} onPress={() => setForm({ ...form, pricingUnit: unit })} />
        ))}
      </View>
      <Toggle label="Đang bán" value={form.isActive} onChange={(isActive) => setForm({ ...form, isActive })} />
      <View className="items-end">
        <Button
          title={service ? "Lưu dịch vụ" : "Thêm dịch vụ"}
          size="sm"
          loading={busy}
          onPress={() =>
            run(
              {
                id: service?.id ?? null,
                input: { destinationId, name: form.name.trim(), description: form.description.trim() || null, price: toInt(form.price) ?? 0, pricingUnit: form.pricingUnit, isActive: form.isActive },
              },
              onDone,
            )
          }
        />
      </View>
    </View>
  );
}
