import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Banner, Card, InfoRow } from "@/components/ui/card";
import { RadioCard } from "@/components/ui/choice";
import { Screen } from "@/components/ui/screen";
import { QueryState } from "@/components/ui/state-view";
import { Colors } from "@/constants/theme";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { formatCountdown, useCountdown } from "@/hooks/use-countdown";
import { ApiError, errorMessage } from "@/services/api/client";
import { useBooking, usePayBooking } from "@/services/booking.service";
import type { BookingDetail, PaymentChannel } from "@/types/api";
import { formatDate, formatVnd } from "@/utils/format";

// B5 – Cổng thanh toán giả lập / kết quả đặt chỗ. KHÔNG có ô nhập số thẻ, CVV, OTP (thanh-toan-gia-lap.md).
export default function BookingResultScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const booking = useBooking(Number(bookingId));
  return (
    <Screen title="Thanh toán & kết quả" maxWidth={960}>
      <QueryState query={booking}>{(data) => <Result booking={data} />}</QueryState>
    </Screen>
  );
}

function Result({ booking }: { booking: BookingDetail }) {
  const { isLg } = useBreakpoint();
  const online = booking.payment?.method === "ONLINE_MOCK";
  const paid = booking.payment?.status === "PAID";

  const summary = (
    <Card className="gap-1">
      <Text className="font-mono text-sm text-muted">{booking.code}</Text>
      <Text className="text-lg font-bold text-brand">{booking.destination.name}</Text>
      <Text className="text-sm text-muted">{`${booking.package.name} · ${booking.roomType.name} × ${booking.roomsCount}`}</Text>
      <Text className="text-sm text-muted">{`${formatDate(booking.checkInDate)} → ${formatDate(booking.checkOutDate)} · ${booking.guests} khách`}</Text>
      <InfoRow label="Tổng tiền" value={formatVnd(booking.totalAmount)} strong />
    </Card>
  );

  const actions = (
    <View className="gap-2">
      <Button title="Xem booking" full onPress={() => router.replace(`/bookings/${booking.id}`)} />
      <Button title="Về trang chủ" full variant="outline" onPress={() => router.replace("/")} />
    </View>
  );

  if (booking.status === "CANCELLED") {
    return (
      <View className="gap-4">
        <Outcome icon="close-circle" color={Colors.danger} title="Booking đã bị hủy" message={booking.cancelReason ?? "Đã hết thời gian giữ chỗ hoặc booking đã bị hủy."} />
        {summary}
        <Button title="Đặt lại" full onPress={() => router.replace(`/destinations/${booking.destination.slug}`)} />
        <Button title="Về trang chủ" full variant="outline" onPress={() => router.replace("/")} />
      </View>
    );
  }

  if (!online) {
    return (
      <View className="gap-4">
        <Outcome icon="time" color={Colors.accent} title="Đặt chỗ thành công" message="Đang chờ cơ sở xác nhận. Bạn sẽ nhận thông báo khi booking được xác nhận và thanh toán khi nhận phòng." />
        {summary}
        {actions}
      </View>
    );
  }

  if (paid) {
    return (
      <View className="gap-4">
        <Outcome icon="checkmark-circle" color={Colors.brandLight} title="Thanh toán thành công" message="Booking đã được xác nhận. Chúc bạn có chuyến đi vui vẻ!" />
        {summary}
        {actions}
      </View>
    );
  }

  return (
    <View className={isLg ? "flex-row gap-6" : "gap-4"}>
      <View className={isLg ? "flex-1 gap-4" : "gap-4"}>{summary}</View>
      <View className={isLg ? "flex-1" : ""}>
        <Gateway booking={booking} />
      </View>
    </View>
  );
}

function Outcome({ icon, color, title, message }: { icon: keyof typeof Ionicons.glyphMap; color: string; title: string; message: string }) {
  return (
    <View className="items-center gap-2 py-6">
      <Ionicons name={icon} size={72} color={color} />
      <Text className="text-center text-xl font-bold text-brand">{title}</Text>
      <Text className="text-center text-base text-muted">{message}</Text>
    </View>
  );
}

const CHANNELS: { value: PaymentChannel; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "CARD", label: "Thẻ", icon: "card-outline" },
  { value: "EWALLET", label: "Ví điện tử", icon: "wallet-outline" },
  { value: "BANK_TRANSFER", label: "Chuyển khoản", icon: "business-outline" },
];

function Gateway({ booking }: { booking: BookingDetail }) {
  const pay = usePayBooking();
  const seconds = useCountdown(booking.paymentDueAt);
  const [channel, setChannel] = useState<PaymentChannel>("EWALLET");
  const [failed, setFailed] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const timeUp = expired || seconds === 0;

  async function submit(simulateFailure: boolean) {
    setFailed(null);
    try {
      await pay.mutateAsync({ id: booking.id, channel, simulateFailure });
    } catch (error) {
      if (error instanceof ApiError && error.code === "PAYMENT_EXPIRED") setExpired(true);
      else setFailed(errorMessage(error));
    }
  }

  if (timeUp) {
    return (
      <View className="gap-4">
        <Outcome icon="hourglass-outline" color={Colors.danger} title="Đã hết thời gian giữ chỗ" message="Booking sẽ tự hủy. Vui lòng đặt lại." />
        <Button title="Đặt lại" full onPress={() => router.replace(`/destinations/${booking.destination.slug}`)} />
      </View>
    );
  }

  return (
    <Card className="gap-4">
      <Banner tone="warning">Môi trường thử nghiệm – không phát sinh giao dịch thật</Banner>
      <View className="items-center gap-1">
        <Text className="text-sm text-muted">Số tiền thanh toán</Text>
        <Text className="text-3xl font-bold text-brand">{formatVnd(booking.totalAmount)}</Text>
        {seconds !== null ? <Text className="text-base font-semibold text-danger">{`Giữ chỗ trong ${formatCountdown(seconds)}`}</Text> : null}
      </View>

      <View className="gap-2">
        {CHANNELS.map((item) => (
          <RadioCard key={item.value} selected={channel === item.value} onPress={() => setChannel(item.value)}>
            <View className="flex-row items-center gap-2">
              <Ionicons name={item.icon} size={20} color={Colors.brand} />
              <Text className="text-base font-semibold text-brand">{item.label}</Text>
            </View>
          </RadioCard>
        ))}
      </View>

      {channel === "EWALLET" ? (
        <View className="items-center gap-2 rounded-xl bg-surface p-4">
          <View className="h-32 w-32 items-center justify-center rounded-xl border-2 border-brand bg-surface-card">
            <Ionicons name="qr-code" size={96} color={Colors.brand} />
          </View>
          <Text className="text-xs text-muted">Mã QR minh họa – bấm “Thanh toán” để mô phỏng quét mã thành công</Text>
        </View>
      ) : channel === "BANK_TRANSFER" ? (
        <View className="gap-1 rounded-xl bg-surface p-4">
          <InfoRow label="Ngân hàng" value="Ngân hàng giả lập" />
          <InfoRow label="Số tài khoản" value="0000 1234 5678" />
          <InfoRow label="Nội dung chuyển khoản" value={booking.code} strong />
        </View>
      ) : (
        <Text className="text-sm text-muted">Cổng giả lập không yêu cầu nhập thông tin thẻ. Bấm “Thanh toán” để mô phỏng giao dịch thẻ thành công.</Text>
      )}

      {failed ? <Banner tone="danger" title="Thanh toán thất bại">{`${failed}. Bạn có thể thử lại khi còn thời gian giữ chỗ.`}</Banner> : null}

      <Button title={failed ? "Thử lại" : "Thanh toán"} full loading={pay.isPending} onPress={() => submit(false)} />
      <Button title="Mô phỏng thất bại" full variant="ghost" disabled={pay.isPending} onPress={() => submit(true)} />
    </Card>
  );
}
