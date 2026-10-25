import Ionicons from "@expo/vector-icons/Ionicons";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { BookingStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Banner, Card, Divider, InfoRow, SectionTitle } from "@/components/ui/card";
import { Dialog, useDialog } from "@/components/ui/dialog";
import { Colors } from "@/constants/theme";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { useCancelBooking, useUpdateBookingStatus } from "@/services/booking.service";
import { toast } from "@/store/toast-store";
import type { BookingDetail } from "@/types/api";
import {
  CHANNEL_LABEL,
  checkInMoment,
  formatDate,
  formatDateTime,
  formatPercent,
  formatVnd,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  PRICING_UNIT_LABEL,
  todayIso,
} from "@/utils/format";

type Mode = "customer" | "owner" | "staff";

const CANCEL_REASONS = ["Khách yêu cầu hủy", "Cơ sở hết phòng", "Không liên lạc được khách", "Sai thông tin đặt chỗ"];

// B6 (khách), O7 (chủ địa điểm), M3 (staff/admin): cùng nội dung, khác nút hành động.
export function BookingDetailView({ booking, mode }: { booking: BookingDetail; mode: Mode }) {
  const { isLg } = useBreakpoint();
  const cancel = useCancelBooking();
  const status = useUpdateBookingStatus();
  const cancelDialog = useDialog();
  const confirmDialog = useDialog<"CONFIRMED" | "COMPLETED">();

  const online = booking.payment?.method === "ONLINE_MOCK";
  const paid = booking.payment?.status === "PAID";
  const active = booking.status === "PENDING" || booking.status === "CONFIRMED";
  const [now] = useState(() => Date.now());
  const hoursLeft = (checkInMoment(booking.checkInDate) - now) / 3600000;
  const freeHours = booking.package.freeCancellationHours ?? 48;
  // BR-07: khách tự hủy trước giờ nhận phòng; booking đã xác nhận phải còn đủ giờ hủy miễn phí.
  const customerCanCancel = active && hoursLeft > 0 && (booking.status === "PENDING" || hoursLeft >= freeHours);
  const managed = mode !== "customer";

  const timeline = [
    { label: "Đặt chỗ", at: booking.createdAt, done: true },
    ...(online ? [{ label: "Thanh toán", at: booking.payment?.paidAt ?? null, done: Boolean(booking.payment?.paidAt) }] : []),
    { label: "Xác nhận", at: booking.confirmedAt, done: Boolean(booking.confirmedAt) },
    booking.status === "CANCELLED"
      ? { label: "Đã hủy", at: booking.cancelledAt, done: true, danger: true }
      : { label: "Hoàn thành", at: booking.completedAt, done: Boolean(booking.completedAt) },
  ];

  const header = (
    <Card className="gap-3">
      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={async () => {
            await Clipboard.setStringAsync(booking.code);
            toast.success("Đã sao chép mã booking");
          }}
          className="flex-row items-center gap-1"
          accessibilityLabel="Sao chép mã booking">
          <Text className="font-mono text-base font-bold text-brand">{booking.code}</Text>
          <Ionicons name="copy-outline" size={16} color={Colors.muted} />
        </Pressable>
        <BookingStatusBadge booking={booking} />
      </View>
      <View className="flex-row">
        {timeline.map((step, index) => (
          <View key={step.label} className="flex-1 items-center gap-1">
            <View className="w-full flex-row items-center">
              <View className={`h-0.5 flex-1 ${index === 0 ? "opacity-0" : step.done ? "bg-brand-light" : "bg-line"}`} />
              <View className={`h-4 w-4 rounded-full ${"danger" in step && step.danger ? "bg-danger" : step.done ? "bg-brand-light" : "bg-line"}`} />
              <View className={`h-0.5 flex-1 ${index === timeline.length - 1 ? "opacity-0" : timeline[index + 1].done ? "bg-brand-light" : "bg-line"}`} />
            </View>
            <Text className="text-center text-xs font-semibold text-brand">{step.label}</Text>
            <Text className="text-center text-[10px] text-muted">{step.at ? formatDateTime(step.at) : "—"}</Text>
          </View>
        ))}
      </View>
      {booking.status === "CANCELLED" && booking.cancelReason ? <Banner tone="danger" title="Lý do hủy">{booking.cancelReason}</Banner> : null}
    </Card>
  );

  const stay = (
    <Card className="gap-1">
      <Pressable onPress={() => router.push(`/destinations/${booking.destination.slug}`)}>
        <Text className="text-lg font-bold text-brand">{booking.destination.name}</Text>
      </Pressable>
      <Text className="text-sm text-muted">{booking.destination.location}</Text>
      <Divider />
      <InfoRow label="Gói" value={booking.package.name} />
      <InfoRow label="Phòng" value={`${booking.roomType.name} × ${booking.roomsCount}`} />
      <InfoRow label="Nhận phòng" value={`${formatDate(booking.checkInDate)} 14:00`} />
      <InfoRow label="Trả phòng" value={`${formatDate(booking.checkOutDate)} 12:00`} />
      <InfoRow label="Số khách" value={`${booking.guests} khách · ${booking.nights} đêm`} />
    </Card>
  );

  const invoice = (
    <Card>
      <SectionTitle title="Hóa đơn" className="mb-2" />
      <InfoRow label={booking.package.name} value={formatVnd(booking.packagePrice)} />
      <InfoRow label={`Phòng (${booking.nights} đêm × ${booking.roomsCount})`} value={formatVnd(booking.roomPrice)} />
      {booking.services.map((line) => (
        <InfoRow key={line.id} label={`${line.addonService.name} × ${line.quantity}${PRICING_UNIT_LABEL[line.addonService.pricingUnit]}`} value={formatVnd(line.totalPrice)} />
      ))}
      <Divider />
      <InfoRow label="Tạm tính" value={formatVnd(booking.subtotal)} />
      {booking.discountAmount ? <InfoRow label={`Giảm giá${booking.voucher ? ` (${booking.voucher.code})` : ""}`} value={`−${formatVnd(booking.discountAmount)}`} tone="success" /> : null}
      <InfoRow label="Thuế/phí" value={formatVnd(booking.taxAmount)} />
      <Divider />
      <InfoRow label="Tổng cộng" value={formatVnd(booking.totalAmount)} strong />
      {managed ? (
        <>
          <Divider />
          <SectionTitle title="Doanh thu" className="mb-1" />
          <InfoRow label={`Hoa hồng sàn (${formatPercent(booking.commissionRate)})`} value={`−${formatVnd(booking.commissionAmount)}`} />
          <InfoRow label="Doanh thu của chủ" value={formatVnd(booking.ownerRevenue)} strong />
        </>
      ) : null}
    </Card>
  );

  const payment = (
    <Card>
      <SectionTitle title="Thanh toán" className="mb-2" />
      <InfoRow label="Phương thức" value={booking.payment ? PAYMENT_METHOD_LABEL[booking.payment.method] : "—"} />
      <InfoRow label="Trạng thái" value={booking.payment ? PAYMENT_STATUS_LABEL[booking.payment.status] : "—"} tone={paid ? "success" : undefined} />
      {booking.payment?.channel ? <InfoRow label="Kênh" value={CHANNEL_LABEL[booking.payment.channel]} /> : null}
      {booking.payment?.paidAt ? <InfoRow label="Thanh toán lúc" value={formatDateTime(booking.payment.paidAt)} /> : null}
      {booking.payment?.refundedAt ? <InfoRow label="Hoàn tiền lúc" value={formatDateTime(booking.payment.refundedAt)} /> : null}
      {booking.status === "PENDING" && online && !paid && booking.paymentDueAt ? <InfoRow label="Hạn thanh toán" value={formatDateTime(booking.paymentDueAt)} tone="danger" /> : null}
    </Card>
  );

  const contact = (
    <Card>
      <SectionTitle title={managed ? "Khách hàng" : "Liên hệ"} className="mb-2" />
      {managed ? <InfoRow label="Tài khoản" value={`${booking.user.name} (${booking.user.email})`} /> : null}
      <InfoRow label="Người lưu trú" value={booking.contactName} />
      <InfoRow label="Điện thoại" value={booking.contactPhone} />
      <InfoRow label="Email" value={booking.contactEmail} />
      {booking.note ? <InfoRow label="Ghi chú" value={booking.note} /> : null}
    </Card>
  );

  // ---------- Nút theo trạng thái ----------
  const actions: React.ReactNode[] = [];
  if (mode === "customer") {
    if (booking.status === "PENDING" && online && !paid) {
      actions.push(<Button key="pay" title="Thanh toán ngay" icon="card-outline" onPress={() => router.push({ pathname: "/booking/result", params: { bookingId: String(booking.id) } })} />);
    }
    if (active) {
      actions.push(
        customerCanCancel ? (
          <Button key="cancel" title="Hủy booking" variant="outline" icon="close-circle-outline" onPress={() => cancelDialog.open(true)} />
        ) : (
          <Text key="cancel" className="text-sm text-muted">Đã quá hạn hủy miễn phí, vui lòng liên hệ CSKH.</Text>
        ),
      );
    }
    if (booking.status === "COMPLETED") {
      actions.push(
        <Button
          key="review"
          title={booking.review ? "Xem / sửa đánh giá" : "Viết đánh giá"}
          variant="secondary"
          icon="star-outline"
          onPress={() => router.push(booking.review ? `/reviews/new?reviewId=${booking.review.id}` : `/reviews/new?bookingId=${booking.id}`)}
        />,
      );
    }
    actions.push(<Button key="support" title="Liên hệ CSKH" variant="ghost" icon="chatbubbles-outline" onPress={() => router.push(`/conversations/new?bookingId=${booking.id}`)} />);
  } else {
    if (booking.status === "PENDING") {
      actions.push(
        online && !paid ? (
          <Text key="wait" className="text-sm text-muted">
            {`Chờ khách thanh toán${booking.paymentDueAt ? ` – hết hạn lúc ${formatDateTime(booking.paymentDueAt)}` : ""}`}
          </Text>
        ) : (
          <Button key="confirm" title="Xác nhận" icon="checkmark-circle-outline" onPress={() => confirmDialog.open("CONFIRMED")} />
        ),
      );
    }
    if (booking.status === "CONFIRMED") {
      const canComplete = todayIso() >= booking.checkInDate.slice(0, 10);
      actions.push(
        canComplete ? (
          <Button key="complete" title="Hoàn thành" icon="flag-outline" onPress={() => confirmDialog.open("COMPLETED")} />
        ) : (
          <Text key="complete" className="text-sm text-muted">{`Hoàn thành được từ ngày nhận phòng ${formatDate(booking.checkInDate)}`}</Text>
        ),
      );
    }
    if (active) actions.push(<Button key="cancel" title="Hủy booking" variant="outline" icon="close-circle-outline" onPress={() => cancelDialog.open(true)} />);
  }

  const actionCard = actions.length ? <Card className="gap-2">{actions}</Card> : null;

  const dialogs = (
    <>
      <Dialog
        open={cancelDialog.isOpen}
        onClose={cancelDialog.close}
        title="Hủy booking?"
        message={
          paid
            ? "Khoản thanh toán sẽ được hoàn lại theo chính sách."
            : managed
              ? "Khách sẽ nhận thông báo kèm lý do hủy."
              : `Booking chờ xác nhận được hủy miễn phí; booking đã xác nhận được hủy miễn phí trước ${freeHours} giờ so với giờ nhận phòng.`
        }
        input={{ label: "Lý do hủy", required: managed, minLength: 3, suggestions: managed ? CANCEL_REASONS : ["Thay đổi kế hoạch", "Đặt nhầm ngày", "Tìm được chỗ khác"] }}
        confirmLabel="Hủy booking"
        destructive
        onConfirm={async (reason) => {
          await cancel.mutateAsync({ id: booking.id, reason: reason || undefined });
          toast.success("Đã hủy booking");
        }}
      />
      <Dialog
        open={confirmDialog.isOpen}
        onClose={confirmDialog.close}
        title={confirmDialog.target === "COMPLETED" ? "Đánh dấu hoàn thành?" : "Xác nhận booking?"}
        message={confirmDialog.target === "COMPLETED" ? "Khách đã lưu trú xong. Khách sẽ được mời viết đánh giá." : "Khách sẽ nhận thông báo booking đã được xác nhận."}
        onConfirm={async () => {
          await status.mutateAsync({ id: booking.id, status: confirmDialog.target! });
          toast.success("Đã cập nhật booking");
        }}
      />
    </>
  );

  if (isLg) {
    return (
      <View className="gap-4">
        {header}
        <View className="flex-row gap-4">
          <View className="flex-1 gap-4">
            {stay}
            {contact}
          </View>
          <View className="flex-1 gap-4">
            {actionCard}
            {invoice}
            {payment}
          </View>
        </View>
        {dialogs}
      </View>
    );
  }
  return (
    <View className="gap-4">
      {header}
      {actionCard}
      {stay}
      {invoice}
      {payment}
      {contact}
      {dialogs}
    </View>
  );
}
