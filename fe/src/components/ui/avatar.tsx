import { Image } from "expo-image";
import { Text, View } from "react-native";

export function Avatar({ name, url, size = 40 }: { name: string; url?: string | null; size?: number }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  if (url) {
    return <Image source={url} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" accessibilityLabel={`Ảnh của ${name}`} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2 }} className="items-center justify-center bg-brand-soft">
      <Text className="font-bold text-brand" style={{ fontSize: size * 0.38 }}>
        {initials || "?"}
      </Text>
    </View>
  );
}
