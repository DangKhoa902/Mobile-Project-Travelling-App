import { router } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { StateView } from "@/components/ui/state-view";

export default function NotFoundScreen() {
  return (
    <Screen title="Không tìm thấy trang">
      <StateView kind="empty" icon="compass-outline" message="Trang bạn tìm không tồn tại hoặc đã được chuyển đi." action={{ label: "Về trang chủ", onPress: () => router.replace("/") }} />
    </Screen>
  );
}
