import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { StepScreen, useBookingFlow } from "@/components/booking/flow";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/card";
import { RadioCard } from "@/components/ui/choice";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/services/api/client";
import { bookingService } from "@/services/booking.service";
import { useAuthStore } from "@/store/auth-store";
import { draftToQuoteInput } from "@/store/booking-draft-store";
import { formatVnd } from "@/utils/format";
import { EMAIL_RE, PHONE_RE } from "@/utils/validation";

// B3 – Thông tin liên hệ (điền sẵn từ hồ sơ), voucher, phương thức thanh toán.
export default function BookingContactScreen() {
  const { draft, quote } = useBookingFlow();
  const user = useAuthStore((state) => state.user);
  const [voucher, setVoucher] = useState(draft.voucherCode ?? "");
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (user && !draft.contactName) draft.update({ contactName: user.name, contactPhone: user.phone ?? "", contactEmail: user.email });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const errors: Record<string, string> = {};
  if (draft.contactName.trim().length < 2) errors.name = "Họ tên tối thiểu 2 ký tự";
  if (!PHONE_RE.test(draft.contactPhone.trim())) errors.phone = "Số điện thoại dạng 0xxxxxxxxx hoặc +84...";
  if (!EMAIL_RE.test(draft.contactEmail.trim())) errors.email = "Email không hợp lệ";
  const valid = Object.keys(errors).length === 0;

  // Áp dụng voucher = báo giá thử với mã; chỉ lưu mã vào nháp khi hợp lệ.
  async function applyVoucher() {
    const code = voucher.trim().toUpperCase();
    const input = draftToQuoteInput(draft, code || null);
    if (!input) return;
    setApplying(true);
    setVoucherError(null);
    try {
      if (code) await bookingService.quote(input);
      draft.update({ voucherCode: code || null });
    } catch (error) {
      setVoucherError(errorMessage(error));
    } finally {
      setApplying(false);
    }
  }

  return (
    <StepScreen
      step={3}
      action={{
        label: "Tiếp tục",
        disabled: quote.isError,
        onPress: () => {
          setTouched(true);
          if (valid) router.push("/booking/review");
        },
      }}>
      <View className="gap-6">
        <View className="gap-3">
          <SectionTitle title="Người lưu trú" />
          <Input label="Họ tên" required value={draft.contactName} onChangeText={(contactName) => draft.update({ contactName })} error={touched ? errors.name : undefined} />
          <Input
            label="Số điện thoại"
            required
            keyboardType="phone-pad"
            value={draft.contactPhone}
            onChangeText={(contactPhone) => draft.update({ contactPhone })}
            error={touched ? errors.phone : undefined}
          />
          <Input
            label="Email"
            required
            keyboardType="email-address"
            autoCapitalize="none"
            value={draft.contactEmail}
            onChangeText={(contactEmail) => draft.update({ contactEmail })}
            error={touched ? errors.email : undefined}
          />
          <Input label="Ghi chú" multiline maxLength={1000} counter={1000} value={draft.note} onChangeText={(note) => draft.update({ note })} placeholder="Ví dụ: phòng tầng cao, đến muộn sau 20:00" />
        </View>

        <View className="gap-2">
          <SectionTitle title="Mã giảm giá" />
          <View className="flex-row items-start gap-2">
            <Input
              className="flex-1"
              value={voucher}
              onChangeText={(text) => {
                setVoucher(text);
                setVoucherError(null);
              }}
              autoCapitalize="characters"
              placeholder="Nhập mã, ví dụ WELCOME10"
              error={voucherError ?? undefined}
            />
            <Button title={draft.voucherCode && voucher.trim().toUpperCase() === draft.voucherCode ? "Đã áp dụng" : "Áp dụng"} variant="secondary" loading={applying} onPress={applyVoucher} />
          </View>
          {draft.voucherCode && quote.data?.price.discountAmount ? (
            <Text className="text-sm font-semibold text-brand-light">{`Giảm giá −${formatVnd(quote.data.price.discountAmount)}`}</Text>
          ) : null}
        </View>

        <View className="gap-3">
          <SectionTitle title="Phương thức thanh toán" />
          <RadioCard selected={draft.paymentMethod === "ONLINE_MOCK"} onPress={() => draft.update({ paymentMethod: "ONLINE_MOCK" })}>
            <Text className="text-base font-bold text-brand">Thanh toán online</Text>
            <Text className="text-sm text-muted">Thẻ, ví điện tử hoặc chuyển khoản. Booking được xác nhận ngay khi thanh toán.</Text>
          </RadioCard>
          <RadioCard selected={draft.paymentMethod === "PAY_AT_PROPERTY"} onPress={() => draft.update({ paymentMethod: "PAY_AT_PROPERTY" })}>
            <Text className="text-base font-bold text-brand">Trả tại nơi lưu trú</Text>
            <Text className="text-sm text-muted">Cơ sở sẽ xác nhận booking; bạn thanh toán khi nhận phòng.</Text>
          </RadioCard>
        </View>
      </View>
    </StepScreen>
  );
}
