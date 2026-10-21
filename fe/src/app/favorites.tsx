import { useQuery } from "@tanstack/react-query";
import { FlatList, View } from "react-native";

import { DestinationCard } from "@/components/destination-card";
import { RequireAuth } from "@/components/require-auth";
import { Screen } from "@/components/screen";
import { StateView } from "@/components/state-view";
import { favoriteService } from "@/services/travel.service";

export default function FavoritesScreen() {
  return (
    <Screen title="Yêu thích">
      <RequireAuth message="Đăng nhập để lưu và xem lại các địa điểm yêu thích.">
        <FavoriteList />
      </RequireAuth>
    </Screen>
  );
}

function FavoriteList() {
  const favorites = useQuery({ queryKey: ["favorites"], queryFn: favoriteService.list });

  if (favorites.isPending) return <StateView kind="loading" />;
  if (favorites.isError) {
    return <StateView kind="error" message={favorites.error.message} onRetry={() => void favorites.refetch()} />;
  }
  return (
    <FlatList
      data={favorites.data.data}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <DestinationCard destination={item} />}
      ItemSeparatorComponent={() => <View className="h-4" />}
      contentContainerClassName="pb-28"
      refreshing={favorites.isRefetching}
      onRefresh={() => void favorites.refetch()}
      ListEmptyComponent={<StateView kind="empty" icon="heart-outline" message="Bạn chưa có địa điểm yêu thích nào." />}
    />
  );
}
