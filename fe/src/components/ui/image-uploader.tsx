import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { IconButton } from "@/components/ui/button";
import { Colors } from "@/constants/theme";
import { errorMessage } from "@/services/api/client";
import { pickImages, uploadImage, type UploadPurpose } from "@/services/upload.service";

type ImageUploaderProps = {
  value: string[];
  onChange: (urls: string[]) => void;
  purpose: UploadPurpose;
  max: number;
  label?: string;
  // Cho phép đổi thứ tự (ảnh đầu tiên là ảnh bìa của địa điểm).
  reorder?: boolean;
};

// Chọn ảnh → nén ≤ 1600px → tải lên /api/uploads → giữ URL. Dùng cho R1 (đánh giá) và O3 (địa điểm).
export function ImageUploader({ value, onChange, purpose, max, label, reorder }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setError(null);
    try {
      const assets = await pickImages(max - value.length);
      if (assets.length === 0) return;
      setUploading(assets.length);
      const urls: string[] = [];
      for (const asset of assets) {
        const uploaded = await uploadImage(asset, purpose);
        urls.push(uploaded.url);
        setUploading((count) => count - 1);
      }
      onChange([...value, ...urls].slice(0, max));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setUploading(0);
    }
  }

  function move(index: number, delta: number) {
    const next = [...value];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    onChange(next);
  }

  return (
    <View className="gap-2">
      {label ? <Text className="text-sm font-medium text-brand">{`${label} (${value.length}/${max})`}</Text> : null}
      <View className="flex-row flex-wrap gap-2">
        {value.map((url, index) => (
          <View key={`${url}-${index}`} className="h-24 w-24 overflow-hidden rounded-xl bg-brand-soft">
            <Image source={url} style={{ width: "100%", height: "100%" }} contentFit="cover" />
            <View className="absolute right-0 top-0">
              <IconButton icon="close-circle" label="Xóa ảnh" color={Colors.white} size={22} onPress={() => onChange(value.filter((_, i) => i !== index))} />
            </View>
            {reorder ? (
              <View className="absolute inset-x-0 bottom-0 flex-row justify-between bg-black/30">
                {index > 0 ? <IconButton icon="chevron-back" label="Đưa lên trước" color={Colors.white} size={16} className="h-7 w-7" onPress={() => move(index, -1)} /> : <View />}
                {index === 0 ? <Text className="self-center text-[10px] font-bold text-white">Ảnh bìa</Text> : null}
                {index < value.length - 1 ? <IconButton icon="chevron-forward" label="Đưa ra sau" color={Colors.white} size={16} className="h-7 w-7" onPress={() => move(index, 1)} /> : <View />}
              </View>
            ) : null}
          </View>
        ))}
        {value.length < max ? (
          <Pressable
            onPress={add}
            disabled={uploading > 0}
            accessibilityLabel="Thêm ảnh"
            className="h-24 w-24 items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line bg-surface-card active:opacity-70">
            {uploading > 0 ? <ActivityIndicator color={Colors.brand} /> : <Ionicons name="add" size={28} color={Colors.brand} />}
            <Text className="text-xs text-muted">{uploading > 0 ? `Đang tải ${uploading}` : "Thêm ảnh"}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text className="text-xs text-danger">{error}</Text> : null}
    </View>
  );
}
