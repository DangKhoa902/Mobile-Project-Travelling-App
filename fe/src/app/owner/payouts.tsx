import { useState } from "react";
import { Text, View } from "react-native";

import { StatCard } from "@/components/dashboard/widgets";
import { Pager } from "@/components/layout/data-table";
import { PayoutDetailCard, PayoutTable } from "@/components/manage/payouts";
import { SectionTitle } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { QueryState } from "@/components/ui/state-view";
import { usePayouts, useUnsettled } from "@/services/payout.service";
import { formatVnd } from "@/utils/format";

// O8 – Đối soát (chỉ xem): tiền chưa đối soát, các kỳ sàn đã lập / đã chuyển, booking từng kỳ.
export default function OwnerPayouts() {
  const unsettled = useUnsettled();
  const [page, setPage] = useState(1);
  const payouts = usePayouts({ page });
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <Screen title="Đối soát">
      <View className="gap-4">
        <QueryState query={unsettled} compact>
          {(data) => (
            <View className="flex-row flex-wrap gap-3">
              <StatCard label="Doanh thu chưa đối soát" value={formatVnd(data.amount)} hint={`${data.bookingCount} booking đã hoàn thành`} icon="receipt-outline" />
              <StatCard label="Khách đã trả" value={formatVnd(data.grossAmount)} icon="card-outline" />
              <StatCard label="Hoa hồng sàn" value={formatVnd(data.commissionAmount)} icon="pie-chart-outline" />
            </View>
          )}
        </QueryState>
        <Text className="text-sm text-muted">Sàn lập kỳ đối soát và chuyển tiền vào tài khoản trong hồ sơ đối tác.</Text>
        <SectionTitle title="Các kỳ đối soát" />
        <QueryState query={payouts} empty={(data) => (data.data.length === 0 ? { message: "Chưa có kỳ đối soát nào", icon: "cash-outline" } : null)}>
          {(data) => (
            <>
              <PayoutTable rows={data.data} onPress={(row) => setSelected(selected === row.id ? null : row.id)} />
              <Pager meta={data.meta} onChange={setPage} />
            </>
          )}
        </QueryState>
        {selected ? <PayoutDetailCard id={selected} /> : null}
      </View>
    </Screen>
  );
}
