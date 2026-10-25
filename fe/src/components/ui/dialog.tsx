import { useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/choice";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/services/api/client";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  children?: ReactNode;
  // Ô nhập (lý do hủy, mã giao dịch...). `inputRequired` khóa nút xác nhận khi ô trống.
  input?: { label: string; placeholder?: string; required?: boolean; suggestions?: string[]; initial?: string; minLength?: number };
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm?: (value: string) => Promise<unknown> | unknown;
  hideCancel?: boolean;
};

// Hộp thoại xác nhận dùng chung (Alert của React Native không có trên web).
// Lỗi API hiện ngay trong hộp thoại; thành công thì tự đóng.
export function Dialog({ open, onClose, title, message, children, input, confirmLabel = "Xác nhận", destructive, onConfirm, hideCancel }: DialogProps) {
  const [value, setValue] = useState(input?.initial ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Mỗi lần mở lại: xóa ô nhập và lỗi cũ.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setValue(input?.initial ?? "");
      setError(null);
    }
  }

  const tooShort = input?.required && value.trim().length < (input.minLength ?? 1);

  async function confirm() {
    if (!onConfirm) return onClose();
    setBusy(true);
    setError(null);
    try {
      await onConfirm(value.trim());
      onClose();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <Pressable className="flex-1 items-center justify-center bg-black/40 p-4" onPress={busy ? undefined : onClose}>
          <Pressable className="w-full max-w-md rounded-2xl bg-surface-card p-5" onPress={(event) => event.stopPropagation()}>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 560 }} contentContainerClassName="gap-3">
              <Text className="text-lg font-bold text-brand">{title}</Text>
              {message ? <Text className="text-base text-muted">{message}</Text> : null}
              {children}
              {input ? (
                <View className="gap-2">
                  {input.suggestions?.length ? (
                    <View className="flex-row flex-wrap gap-2">
                      {input.suggestions.map((suggestion) => (
                        <Chip key={suggestion} label={suggestion} active={value === suggestion} onPress={() => setValue(suggestion)} />
                      ))}
                    </View>
                  ) : null}
                  <Input label={input.label} required={input.required} placeholder={input.placeholder} value={value} onChangeText={setValue} />
                </View>
              ) : null}
              {error ? <Text className="text-sm text-danger">{error}</Text> : null}
            </ScrollView>
            <View className="mt-4 flex-row justify-end gap-2">
              {hideCancel ? null : <Button title="Đóng" variant="outline" onPress={onClose} disabled={busy} />}
              {onConfirm ? (
                <Button title={confirmLabel} variant={destructive ? "danger" : "primary"} onPress={confirm} loading={busy} disabled={Boolean(tooShort)} />
              ) : null}
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Trạng thái mở/đóng + dữ liệu đi kèm (ví dụ booking đang hủy).
export function useDialog<T = true>() {
  const [target, setTarget] = useState<T | null>(null);
  return { target, open: (value: T) => setTarget(value), close: () => setTarget(null), isOpen: target !== null };
}
