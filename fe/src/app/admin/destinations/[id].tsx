import { useLocalSearchParams } from "expo-router";

import { DestinationEditor } from "@/components/manage/destination-editor";
import { Screen } from "@/components/ui/screen";

// M8 – Thêm (`/admin/destinations/new`) / sửa địa điểm: dùng chung form O3, thêm Chủ địa điểm và Nổi bật.
export default function AdminDestinationEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const destinationId = id === "new" ? null : Number(id);
  return (
    <Screen back backHref="/admin/destinations" title={destinationId ? "Sửa địa điểm" : "Thêm địa điểm"} maxWidth={900}>
      <DestinationEditor id={destinationId} mode="admin" />
    </Screen>
  );
}
