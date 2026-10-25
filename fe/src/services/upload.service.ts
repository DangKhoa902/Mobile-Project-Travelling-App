import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

import { apiClient } from "@/services/api/client";
import type { Upload } from "@/types/api";

export type UploadPurpose = "avatar" | "destination" | "review";

const MAX_EDGE = 1600;

// Chọn ảnh từ thư viện; trả về danh sách asset (rỗng nếu người dùng hủy).
export async function pickImages(limit: number): Promise<ImagePicker.ImagePickerAsset[]> {
  if (Platform.OS !== "web") {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new Error("Cần cấp quyền truy cập thư viện ảnh");
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
    quality: 1,
  });
  return result.canceled ? [] : result.assets.slice(0, limit);
}

// Nén về cạnh dài ≤ 1600px rồi tải lên POST /api/uploads. Không tự đặt Content-Type để Axios thêm boundary.
export async function uploadImage(asset: ImagePicker.ImagePickerAsset, purpose: UploadPurpose): Promise<Upload> {
  const longest = Math.max(asset.width, asset.height);
  const context = ImageManipulator.manipulate(asset.uri);
  if (longest > MAX_EDGE) context.resize(asset.width >= asset.height ? { width: MAX_EDGE } : { height: MAX_EDGE });
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });

  const form = new FormData();
  if (Platform.OS === "web") {
    const blob = await (await fetch(saved.uri)).blob();
    form.append("file", new File([blob], "image.jpg", { type: "image/jpeg" }));
  } else {
    form.append("file", { uri: saved.uri, name: "image.jpg", type: "image/jpeg" } as unknown as Blob);
  }
  form.append("purpose", purpose);

  const { data } = await apiClient.post<{ data: Upload }>("/uploads", form, { timeout: 60000 });
  return data.data;
}
