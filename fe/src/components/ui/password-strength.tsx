import { Text, View } from "react-native";

const LABELS = ["Rất yếu", "Yếu", "Trung bình", "Khá", "Mạnh", "Rất mạnh"];
const COLORS = ["bg-danger", "bg-danger", "bg-accent", "bg-accent", "bg-brand-light", "bg-brand-light"];

// Thanh độ mạnh mật khẩu ở A2, A4, P2.
export function PasswordStrength({ value }: { value: string }) {
  if (!value) return null;
  const score = [value.length >= 8, /[a-z]/.test(value) && /[A-Z]/.test(value), /\d/.test(value), /[^A-Za-z0-9]/.test(value), value.length >= 12].filter(Boolean).length;
  return (
    <View className="gap-1">
      <View className="flex-row gap-1">
        {[0, 1, 2, 3, 4].map((index) => (
          <View key={index} className={`h-1.5 flex-1 rounded-full ${index < score ? COLORS[score] : "bg-line"}`} />
        ))}
      </View>
      <Text className="text-xs text-muted">{`Độ mạnh: ${LABELS[score]}`}</Text>
    </View>
  );
}
