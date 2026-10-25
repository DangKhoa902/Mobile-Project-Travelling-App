import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { View } from "react-native";

import { DestinationCard } from "@/components/explore/destination-card";
import { RequireAuth } from "@/components/layout/require-auth";
import { Screen } from "@/components/ui/screen";
import { QueryState } from "@/components/ui/state-view";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { errorMessage } from "@/services/api/client";
import { useFavorites, useToggleFavorite } from "@/services/destination.service";
import { toast } from "@/store/toast-store";
import type { DestinationSummary, Paginated } from "@/types/api";

// T2 – Yêu thích: bỏ ♥ gỡ thẻ ngay, có "Hoàn tác".
export default function FavoritesScreen() {
  const favorites = useFavorites();
  const toggle = useToggleFavorite();
  const queryClient = useQueryClient();
  const { isMd, isLg } = useBreakpoint();
  const columns = isLg ? 3 : isMd ? 2 : 1;

  function remove(destination: DestinationSummary) {
    const previous = queryClient.getQueryData<Paginated<DestinationSummary>>(["favorites"]);
    if (previous) queryClient.setQueryData(["favorites"], { ...previous, data: previous.data.filter((item) => item.id !== destination.id) });
    toggle.mutate(destination.id, {
      onSuccess: () => toast.success("Đã bỏ yêu thích", { label: "Hoàn tác", onPress: () => toggle.mutate(destination.id) }),
      onError: (error) => {
        if (previous) queryClient.setQueryData(["favorites"], previous);
        toast.error(errorMessage(error));
      },
    });
  }

  return (
    <Screen title="Yêu thích" refreshing={favorites.isRefetching} onRefresh={() => void favorites.refetch()}>
      <RequireAuth message="Đăng nhập để lưu địa điểm yêu thích">
        <QueryState
          query={favorites}
          empty={(data) =>
            data.data.length === 0
              ? { message: "Bạn chưa có địa điểm yêu thích", icon: "heart-outline", action: { label: "Khám phá ngay", onPress: () => router.navigate("/") } }
              : null
          }>
          {(data) => (
            <View className="flex-row flex-wrap" style={{ marginHorizontal: -6 }}>
              {data.data.map((destination) => (
                <View key={destination.id} style={{ width: `${100 / columns}%`, padding: 6 }}>
                  <DestinationCard destination={destination} favorite={{ active: true, onToggle: () => remove(destination) }} />
                </View>
              ))}
            </View>
          )}
        </QueryState>
      </RequireAuth>
    </Screen>
  );
}
