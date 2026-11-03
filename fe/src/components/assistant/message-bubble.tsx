import Ionicons from "@expo/vector-icons/Ionicons";
import { ScrollView, Text, View } from "react-native";

import { DestinationCard } from "@/components/explore/destination-card";
import { Colors } from "@/constants/theme";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import type { DestinationSummary } from "@/types/api";

export type ChatItem = { id: number; role: "user" | "model"; text: string; destinations?: DestinationSummary[] };

// Bong bóng chat giống ChatView; thẻ địa điểm nằm dưới tin AI đã trả về chúng.
export function MessageBubble({ item }: { item: ChatItem }) {
  const { isMd } = useBreakpoint();
  const mine = item.role === "user";
  const cards = item.destinations ?? [];
  return (
    <View className={`gap-2 ${mine ? "max-w-[85%] items-end self-end" : "self-stretch"}`}>
      <View className={`gap-0.5 ${mine ? "items-end" : "max-w-[85%] self-start"}`}>
        {!mine ? (
          <View className="flex-row items-center gap-1">
            <Ionicons name="sparkles" size={12} color={Colors.info} />
            <Text className="text-xs font-semibold text-info">Trợ lý AI</Text>
          </View>
        ) : null}
        <View className={`rounded-2xl px-3 py-2 ${mine ? "rounded-br-sm bg-brand" : "rounded-bl-sm border border-info/30 bg-info-soft"}`}>
          <Text selectable className={`text-base ${mine ? "text-white" : "text-brand"}`}>
            {item.text}
          </Text>
        </View>
      </View>
      {cards.length > 0 ? (
        isMd ? (
          <View className="flex-row flex-wrap gap-3">
            {cards.map((destination) => (
              <View key={destination.id} style={{ width: 280 }}>
                <DestinationCard destination={destination} />
              </View>
            ))}
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3">
            {cards.map((destination) => (
              <DestinationCard key={destination.id} destination={destination} compact />
            ))}
          </ScrollView>
        )
      ) : null}
    </View>
  );
}
