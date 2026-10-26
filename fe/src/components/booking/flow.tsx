import { router } from "expo-router";
import type { ReactNode } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Divider, InfoRow } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { StateView } from "@/components/ui/state-view";
import { Colors } from "@/constants/theme";
import { useDebounce } from "@/hooks/use-debounce";
import { errorMessage } from "@/services/api/client";
import { useQuote } from "@/services/booking.service";
import { useDestination } from "@/services/destination.service";
import { draftToQuoteInput, useBookingDraft } from "@/store/booking-draft-store";
import type { Quote } from "@/types/api";
import { formatVnd, PRICING_UNIT_LABEL } from "@/utils/format";

// Dữ liệu dùng chung cho B1–B4: địa điểm trong nháp + báo giá (debounce 400 ms mỗi khi đổi lựa chọn).
export function useBookingFlow() {
  const draft = useBookingDraft();
  const destination = useDestination(draft.destinationId ?? undefined);
  const input = useDebounce(draftToQuoteInput(draft), 400);
  const quote = useQuote(input);
  return { draft, destination, quote, input };
}

const STEPS = ["Gói & phòng", "Dịch vụ", "Liên hệ", "Xác nhận"];

// Khung một bước: tên địa điểm, thanh tiến trình "Bước n/4", thanh đáy tạm tính + nút.
export function StepScreen({
  step,
  children,
  action,
}: {
  step: number;
  children: ReactNode;
  action: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean; secondary?: { label: string; onPress: () => void } };
}) {
  const { draft, destination, quote, input } = useBookingFlow();

  if (!draft.destinationId) {
    return (
      <Screen back title="Đặt chỗ">
        <StateView kind="empty" icon="map-outline" message="Bạn chưa chọn địa điểm để đặt" action={{ label: "Khám phá ngay", onPress: () => router.replace("/") }} />
      </Screen>
    );
  }

  // Tạm tính ở hàng trên, nút chính rộng hết thanh và căn giữa.
  const footer = (
    <View className="gap-2">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-sm text-muted">Tạm tính</Text>
        {quote.isFetching && !quote.data ? (
          <ActivityIndicator color={Colors.brand} />
        ) : quote.data && input ? (
          <Text className="text-xl font-bold text-brand">{formatVnd(quote.data.price.totalAmount)}</Text>
        ) : (
          <Text className="text-sm text-muted">Chọn đủ gói, phòng, ngày</Text>
        )}
      </View>
      <View className="flex-row gap-2">
        {action.secondary ? <Button title={action.secondary.label} variant="outline" className="flex-1" onPress={action.secondary.onPress} /> : null}
        <Button title={action.label} className="flex-1" onPress={action.onPress} disabled={action.disabled} loading={action.loading} />
      </View>
    </View>
  );

  return (
    <Screen back backHref={destination.data ? `/destinations/${destination.data.slug}` : "/"} title={destination.data?.name ?? "Đặt chỗ"} subtitle={`Bước ${step}/4 · ${STEPS[step - 1]}`} footer={footer} maxWidth={760}>
      <View className="mb-4 flex-row gap-1">
        {STEPS.map((label, index) => (
          <View key={label} className={`h-1.5 flex-1 rounded-full ${index < step ? "bg-brand" : "bg-line"}`} />
        ))}
      </View>
      {destination.isPending ? <StateView kind="loading" /> : destination.isError ? <StateView kind="error" error={destination.error} onRetry={() => void destination.refetch()} /> : children}
    </Screen>
  );
}

export function QuoteError({ error }: { error: unknown }) {
  return (
    <View className="rounded-xl bg-danger-soft p-3">
      <Text className="text-sm text-danger">{errorMessage(error)}</Text>
    </View>
  );
}

// Hóa đơn theo công thức nghiệp vụ (mục 11): gói + phòng + dịch vụ − giảm giá + thuế. Số lấy từ /bookings/quote.
export function Invoice({ quote }: { quote: Quote }) {
  const { price } = quote;
  const seasonal = quote.nightlyRoomPrices.some((night) => night.rateName);
  return (
    <View>
      <InfoRow label={quote.package.name} value={formatVnd(price.packagePrice)} />
      <InfoRow
        label={seasonal ? `Phòng (${quote.nights} đêm × ${quote.roomsCount}, có giá mùa)` : `Phòng (${formatVnd(quote.roomType.pricePerNight)} × ${quote.nights} đêm × ${quote.roomsCount})`}
        value={formatVnd(price.roomPrice)}
      />
      {seasonal ? (
        <View className="mb-1 ml-3 gap-0.5">
          {quote.nightlyRoomPrices.map((night) => (
            <Text key={night.date} className="text-xs text-muted">
              {`${night.date.slice(8)}/${night.date.slice(5, 7)}: ${formatVnd(night.price)}${night.rateName ? ` (${night.rateName})` : ""}`}
            </Text>
          ))}
        </View>
      ) : null}
      {quote.services.map((service) => (
        <InfoRow key={service.id} label={`${service.name} × ${service.quantity}${PRICING_UNIT_LABEL[service.pricingUnit]}`} value={formatVnd(service.totalPrice)} />
      ))}
      <Divider />
      <InfoRow label="Tạm tính" value={formatVnd(price.subtotal)} />
      {price.discountAmount ? <InfoRow label={`Giảm giá${quote.voucherCode ? ` (${quote.voucherCode})` : ""}`} value={`−${formatVnd(price.discountAmount)}`} tone="success" /> : null}
      <InfoRow label={`Thuế/phí (${Math.round(quote.taxRate * 100)}%)`} value={formatVnd(price.taxAmount)} />
      <Divider />
      <InfoRow label="Tổng cộng" value={formatVnd(price.totalAmount)} strong />
    </View>
  );
}
