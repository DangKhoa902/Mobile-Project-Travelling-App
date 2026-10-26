import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { Invoice, QuoteError, StepScreen, useBookingFlow } from "@/components/booking/flow";
import { Card, InfoRow, SectionTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/choice";
import { Dialog } from "@/components/ui/dialog";
import { StateView } from "@/components/ui/state-view";
import { ApiError, errorMessage } from "@/services/api/client";
import { useCreateBooking } from "@/services/booking.service";
import { draftToQuoteInput } from "@/store/booking-draft-store";
import { formatDate, PAYMENT_METHOD_LABEL } from "@/utils/format";

// B4 – Xác nhận đơn: hóa đơn từ báo giá, đồng ý chính sách, "Xác nhận đặt" (khóa khi đang gửi).
export default function BookingReviewScreen() {
  const { draft, destination, quote } = useBookingFlow();
  const create = useCreateBooking();
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const pkg = destination.data?.packages.find((item) => item.id === draft.packageId);

  async function submit() {
    const input = draftToQuoteInput(draft);
    if (!input) return;
    setError(null);
    try {
      const booking = await create.mutateAsync({
        ...input,
        contactName: draft.contactName.trim(),
        contactPhone: draft.contactPhone.trim(),
        contactEmail: draft.contactEmail.trim(),
        ...(draft.note.trim() ? { note: draft.note.trim() } : {}),
        paymentMethod: draft.paymentMethod,
      });
      // replace: nút back không quay lại B4. Xóa nháp sau khi đã rời trang để B4 không render lại với nháp rỗng.
      router.replace({ pathname: "/booking/result", params: { bookingId: String(booking.id) } });
      setTimeout(() => draft.reset(), 0);
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "NOT_AVAILABLE") setUnavailable(true);
      else setError(errorMessage(caught));
    }
  }

  return (
    <StepScreen step={4} action={{ label: "Đặt ngay", onPress: submit, disabled: !agree || !quote.data || quote.isError, loading: create.isPending }}>
      {quote.isError ? (
        <QuoteError error={quote.error} />
      ) : !quote.data ? (
        <StateView kind="loading" />
      ) : (
        <View className="gap-5">
          <Card className="gap-1">
            <Text className="text-lg font-bold text-brand">{quote.data.destination.name}</Text>
            <Text className="text-sm text-muted">{`${quote.data.package.name} · ${quote.data.roomType.name} × ${quote.data.roomsCount} · ${quote.data.guests} khách`}</Text>
            <Text className="text-sm text-muted">{draft.checkInDate && draft.checkOutDate ? `Nhận ${formatDate(draft.checkInDate)} → Trả ${formatDate(draft.checkOutDate)} (${quote.data.nights} đêm)` : ""}</Text>
          </Card>

          <Card>
            <Invoice quote={quote.data} />
          </Card>

          <View className="gap-2">
            <SectionTitle title="Liên hệ & thanh toán" />
            <Card>
              <InfoRow label="Người lưu trú" value={draft.contactName} />
              <InfoRow label="Điện thoại" value={draft.contactPhone} />
              <InfoRow label="Email" value={draft.contactEmail} />
              {draft.note ? <InfoRow label="Ghi chú" value={draft.note} /> : null}
              <InfoRow label="Thanh toán" value={PAYMENT_METHOD_LABEL[draft.paymentMethod]} />
            </Card>
          </View>

          <View className="gap-2">
            <SectionTitle title="Chính sách hủy" />
            <Text className="text-sm leading-5 text-brand">
              {`Booking chờ xác nhận được hủy miễn phí trước giờ nhận phòng (14:00). Booking đã xác nhận được hủy miễn phí trước ${pkg?.freeCancellationHours ?? 48} giờ so với giờ nhận phòng; khoản đã thanh toán được hoàn lại.`}
            </Text>
            {draft.paymentMethod === "ONLINE_MOCK" ? <Text className="text-sm text-muted">Sau khi đặt, bạn có 15 phút để thanh toán; quá hạn booking tự hủy.</Text> : null}
          </View>

          <Checkbox checked={agree} onChange={setAgree} label="Tôi đồng ý với chính sách đặt chỗ và hủy" />
          {error ? <QuoteError error={new Error(error)} /> : null}
        </View>
      )}
      <Dialog
        open={unavailable}
        onClose={() => setUnavailable(false)}
        title="Hết chỗ"
        message="Dịch vụ không còn khả dụng trong khoảng thời gian bạn chọn. Vui lòng chọn lại ngày hoặc loại phòng."
        confirmLabel="Chọn lại"
        onConfirm={() => router.replace("/booking/options")}
      />
    </StepScreen>
  );
}
