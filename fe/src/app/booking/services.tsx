import { router } from "expo-router";
import { Text, View } from "react-native";

import { QuoteError, StepScreen, useBookingFlow } from "@/components/booking/flow";
import { Card } from "@/components/ui/card";
import { Checkbox, Stepper } from "@/components/ui/choice";
import { StateView } from "@/components/ui/state-view";
import { formatVnd, PRICING_UNIT_LABEL } from "@/utils/format";

const HOW: Record<string, string> = {
  PER_BOOKING: "giá × số lượng",
  PER_GUEST: "giá × số khách × số lượng",
  PER_NIGHT: "giá × số đêm × số lượng",
};

// B2 – Dịch vụ bổ sung: chọn + số lượng; thành tiền từng dòng lấy từ báo giá.
export default function BookingServicesScreen() {
  const { draft, destination, quote } = useBookingFlow();
  const services = destination.data?.services.filter((item) => item.isActive) ?? [];

  return (
    <StepScreen
      step={2}
      action={{
        label: "Tiếp tục",
        disabled: quote.isError,
        onPress: () => router.push("/booking/contact"),
        secondary: Object.keys(draft.services).length === 0 ? { label: "Bỏ qua", onPress: () => router.push("/booking/contact") } : undefined,
      }}>
      <View className="gap-3">
        {services.length === 0 ? <StateView kind="empty" icon="sparkles-outline" message="Địa điểm này không có dịch vụ bổ sung" /> : null}
        {services.map((service) => {
          const quantity = draft.services[service.id] ?? 0;
          const line = quote.data?.services.find((item) => item.id === service.id);
          return (
            <Card key={service.id} className="gap-2">
              <Checkbox checked={quantity > 0} onChange={(checked) => draft.setService(service.id, checked ? 1 : 0)}>
                <View className="flex-row justify-between gap-2">
                  <Text className="flex-1 text-base font-semibold text-brand">{service.name}</Text>
                  <Text className="font-medium text-brand">{`${formatVnd(service.price)}${PRICING_UNIT_LABEL[service.pricingUnit]}`}</Text>
                </View>
                {service.description ? <Text className="text-sm text-muted">{service.description}</Text> : null}
              </Checkbox>
              {quantity > 0 ? (
                <View className="gap-1 pl-9">
                  <Stepper label="Số lượng" value={quantity} min={1} max={20} onChange={(value) => draft.setService(service.id, value)} />
                  <Text className="text-sm text-muted">{`Thành tiền (${HOW[service.pricingUnit]}): ${line ? formatVnd(line.totalPrice) : "…"}`}</Text>
                </View>
              ) : null}
            </Card>
          );
        })}
        {quote.isError ? <QuoteError error={quote.error} /> : null}
      </View>
    </StepScreen>
  );
}
