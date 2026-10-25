import { useLocalSearchParams } from "expo-router";

import { DestinationEditor } from "@/components/manage/destination-editor";
import { Screen } from "@/components/ui/screen";

// O3 – Tạo (`/owner/destinations/new`) / sửa tin đăng.
export default function OwnerDestinationEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const destinationId = id === "new" ? null : Number(id);
  return (
    <Screen back backHref="/owner/destinations" title={destinationId ? "Sửa tin đăng" : "Đăng địa điểm mới"} maxWidth={900}>
      <DestinationEditor id={destinationId} mode="owner" />
    </Screen>
  );
}
