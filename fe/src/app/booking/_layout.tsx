import { Stack } from "expo-router";

// Luồng đặt chỗ nhiều bước B1 → B5; tiến trình "Bước n/4" vẽ trong từng trang (StepScreen).
export default function BookingLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
