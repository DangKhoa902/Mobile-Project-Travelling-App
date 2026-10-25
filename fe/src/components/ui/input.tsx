import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, Text, TextInput, View, type TextInputProps } from "react-native";

import { Colors } from "@/constants/theme";

type InputProps = TextInputProps & {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  password?: boolean;
  left?: keyof typeof Ionicons.glyphMap;
  counter?: number; // hiện "12/2000"
};

// Ô nhập có nhãn, dấu * bắt buộc, lỗi hiện ngay dưới ô (theo details[].path của API).
export function Input({ label, required, error, hint, password, left, counter, multiline, className = "", ...props }: InputProps) {
  const [hidden, setHidden] = useState(true);
  return (
    <View className={`gap-1 ${className}`}>
      {label ? (
        <Text className="text-sm font-medium text-brand">
          {label}
          {required ? <Text className="text-danger"> *</Text> : null}
        </Text>
      ) : null}
      <View
        className={`flex-row items-center rounded-xl border bg-surface-card px-3 ${error ? "border-danger" : "border-line"} ${multiline ? "items-start py-2" : "min-h-12"}`}>
        {left ? <Ionicons name={left} size={18} color={Colors.muted} style={{ marginRight: 8 }} /> : null}
        <TextInput
          placeholderTextColor={Colors.muted}
          secureTextEntry={password && hidden}
          multiline={multiline}
          className={`flex-1 text-base text-brand ${multiline ? "min-h-24" : "py-2"}`}
          style={multiline ? { textAlignVertical: "top" } : undefined}
          accessibilityLabel={label}
          {...props}
        />
        {password ? (
          <Pressable onPress={() => setHidden(!hidden)} accessibilityLabel={hidden ? "Hiện mật khẩu" : "Ẩn mật khẩu"} hitSlop={8} className="p-1">
            <Ionicons name={hidden ? "eye-outline" : "eye-off-outline"} size={20} color={Colors.muted} />
          </Pressable>
        ) : null}
      </View>
      <View className="flex-row justify-between">
        {error ? <Text className="flex-1 text-xs text-danger">{error}</Text> : hint ? <Text className="flex-1 text-xs text-muted">{hint}</Text> : <View />}
        {counter !== undefined ? <Text className="text-xs text-muted">{`${String(props.value ?? "").length}/${counter}`}</Text> : null}
      </View>
    </View>
  );
}

// Chuyển chuỗi nhập thành số nguyên (ô giá, số lượng); rỗng → undefined.
export function toInt(value: string): number | undefined {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number(digits) : undefined;
}
