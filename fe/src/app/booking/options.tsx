import { router, usePathname } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";

import { QuoteError, StepScreen, useBookingFlow } from "@/components/booking/flow";
import { loginHref } from "@/components/layout/require-auth";
import { SectionTitle } from "@/components/ui/card";
import { RadioCard, Stepper } from "@/components/ui/choice";
import { DateField } from "@/components/ui/date-field";
import { useAvailability } from "@/services/destination.service";
import { useAuthStore } from "@/store/auth-store";
import type { RoomType } from "@/types/api";
import { addDays, daysBetween, formatDate, formatVnd, todayIso } from "@/utils/format";

const MAX_NIGHTS = 30;

// B1 – Chọn gói, ngày, phòng, số khách. Kiểm tra trên giao diện, backend kiểm tra lại.
export default function BookingOptionsScreen() {
  const { draft, destination, quote } = useBookingFlow();
  const authed = useAuthStore((state) => state.status === "authenticated");
  const pathname = usePathname();
  const data = destination.data;
  const packages = data?.packages.filter((item) => item.isActive) ?? [];
  const rooms = data?.roomTypes.filter((item) => item.isActive) ?? [];
  const pkg = packages.find((item) => item.id === draft.packageId);
  const room = rooms.find((item) => item.id === draft.roomTypeId);
  const today = todayIso();

  // Chọn sẵn gói rẻ nhất / phòng đầu tiên khi mới vào.
  useEffect(() => {
    if (!data) return;
    if (!pkg && packages[0]) draft.update({ packageId: [...packages].sort((a, b) => a.price - b.price)[0].id });
    if (!room && rooms[0]) draft.update({ roomTypeId: rooms[0].id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id]);

  const nights = draft.checkInDate && draft.checkOutDate ? daysBetween(draft.checkInDate, draft.checkOutDate) : 0;
  const errors: Record<string, string> = {};
  if (draft.checkInDate && draft.checkInDate < today) errors.checkIn = "Ngày nhận phòng không được ở quá khứ";
  if (draft.checkInDate && draft.checkOutDate && nights <= 0) errors.checkOut = "Ngày trả phòng phải sau ngày nhận";
  if (nights > MAX_NIGHTS) errors.checkOut = `Tối đa ${MAX_NIGHTS} đêm`;
  if (pkg && nights > 0 && nights < pkg.durationNights) errors.checkOut = `Gói ${pkg.name} cần ở ít nhất ${pkg.durationNights} đêm`;
  const capacity = room ? room.capacity * draft.roomsCount : 0;
  if (room && draft.guests > capacity) errors.guests = `Phòng ${room.name} chứa tối đa ${room.capacity} khách/phòng – hãy tăng số phòng`;

  const ready = Boolean(pkg && room && draft.checkInDate && draft.checkOutDate) && Object.keys(errors).length === 0;
  const available = quote.data?.isAvailable !== false;

  // Gợi ý ngày trả = ngày nhận + số đêm của gói.
  function pickCheckIn(value: string | null) {
    const suggested = value && pkg ? addDays(value, Math.max(1, pkg.durationNights)) : null;
    draft.update({ checkInDate: value, checkOutDate: !draft.checkOutDate || (value && draft.checkOutDate <= value) ? suggested : draft.checkOutDate });
  }

  const rates = room?.rates ?? [];
  const isSeasonal = (iso: string) => rates.some((rate) => iso >= rate.startDate.slice(0, 10) && iso <= rate.endDate.slice(0, 10));
  const seasonalNights = quote.data?.nightlyRoomPrices.filter((night) => night.rateName) ?? [];

  return (
    <StepScreen
      step={1}
      action={{
        label: "Tiếp tục",
        disabled: !ready || !available || quote.isError,
        onPress: () => (authed ? router.push("/booking/services") : router.push(loginHref(pathname))),
      }}>
      <View className="gap-6">
        <View className="gap-3">
          <SectionTitle title="Chọn gói" />
          {packages.map((item) => (
            <RadioCard key={item.id} selected={item.id === draft.packageId} onPress={() => draft.update({ packageId: item.id })}>
              <View className="flex-row justify-between gap-2">
                <Text className="flex-1 text-base font-bold text-brand">{item.name}</Text>
                <Text className="font-bold text-brand">{formatVnd(item.price)}</Text>
              </View>
              <Text className="text-sm text-muted">{`${item.durationDays} ngày ${item.durationNights} đêm · Hủy miễn phí trước ${item.freeCancellationHours} giờ`}</Text>
            </RadioCard>
          ))}
        </View>

        <View className="gap-3">
          <SectionTitle title="Ngày lưu trú" />
          <View className="gap-3 md:flex-row">
            <View className="flex-1">
              <DateField
                label="Nhận phòng"
                required
                value={draft.checkInDate}
                onChange={pickCheckIn}
                min={today}
                error={errors.checkIn}
                highlight={isSeasonal}
                highlightLabel={rates.length ? `Ngày có giá mùa (${rates.map((rate) => rate.name).join(", ")})` : undefined}
              />
            </View>
            <View className="flex-1">
              <DateField
                label="Trả phòng"
                required
                value={draft.checkOutDate}
                onChange={(value) => draft.update({ checkOutDate: value })}
                min={draft.checkInDate ? addDays(draft.checkInDate, 1) : addDays(today, 1)}
                max={draft.checkInDate ? addDays(draft.checkInDate, MAX_NIGHTS) : undefined}
                error={errors.checkOut}
                highlight={isSeasonal}
              />
            </View>
          </View>
          {nights > 0 ? <Text className="text-sm text-muted">{`${nights} đêm`}</Text> : null}
        </View>

        <View className="gap-3">
          <SectionTitle title="Loại phòng" />
          {rooms.map((item) => (
            <RoomOption key={item.id} room={item} destinationId={data!.id} selected={item.id === draft.roomTypeId} onSelect={() => draft.update({ roomTypeId: item.id })} />
          ))}
          {seasonalNights.length ? (
            <Text className="text-sm text-[#8A5A12]">
              {`Có ${seasonalNights.length} đêm giá ${seasonalNights[0].rateName} (${formatVnd(seasonalNights[0].price)}/đêm)`}
            </Text>
          ) : null}
        </View>

        <View className="gap-3">
          <SectionTitle title="Số khách và phòng" />
          <Stepper label="Số khách" value={draft.guests} min={1} max={50} onChange={(guests) => draft.update({ guests })} />
          <Stepper label="Số phòng" value={draft.roomsCount} min={1} max={20} onChange={(roomsCount) => draft.update({ roomsCount })} />
          {errors.guests ? <Text className="text-sm text-danger">{errors.guests}</Text> : null}
        </View>

        {quote.isError ? <QuoteError error={quote.error} /> : null}
        {quote.data && !quote.data.isAvailable ? <QuoteError error={new Error(`Chỉ còn ${quote.data.availableRooms} phòng trống trong thời gian này`)} /> : null}
        {draft.checkInDate && draft.checkOutDate && nights > 0 ? (
          <Text className="text-xs text-muted">{`${formatDate(draft.checkInDate)} → ${formatDate(draft.checkOutDate)}`}</Text>
        ) : null}
      </View>
    </StepScreen>
  );
}

// Thẻ loại phòng kèm "Còn N phòng" (BR-04); hết phòng thì làm mờ.
function RoomOption({ room, destinationId, selected, onSelect }: { room: RoomType; destinationId: number; selected: boolean; onSelect: () => void }) {
  const { checkInDate, checkOutDate } = useBookingFlow().draft;
  const availability = useAvailability(destinationId, room.id, checkInDate, checkOutDate);
  const soldOut = availability.data?.availableRooms === 0;
  return (
    <RadioCard selected={selected} onPress={onSelect} disabled={soldOut}>
      <View className="flex-row justify-between gap-2">
        <Text className="flex-1 text-base font-bold text-brand">{room.name}</Text>
        <Text className="font-bold text-brand">{`${formatVnd(room.pricePerNight)}/đêm`}</Text>
      </View>
      <Text className="text-sm text-muted">
        {`Tối đa ${room.capacity} khách/phòng`}
        {availability.data ? (soldOut ? " · Hết phòng" : ` · Còn ${availability.data.availableRooms} phòng`) : ""}
      </Text>
      {room.rates?.map((rate) => (
        <Text key={rate.id} className="text-xs text-[#8A5A12]">{`${rate.name}: ${formatVnd(rate.pricePerNight)}/đêm (${formatDate(rate.startDate)} – ${formatDate(rate.endDate)})`}</Text>
      ))}
    </RadioCard>
  );
}
