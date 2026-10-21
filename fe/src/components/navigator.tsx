import Ionicons from "@expo/vector-icons/Ionicons";
import Feather from "@expo/vector-icons/Feather";
import Entypo from "@expo/vector-icons/Entypo";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, Text, View } from "react-native";

export function Navigator() {
  return (
    <View className="bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 px-2 py-3">
      <View className="flex-col justify-around items-center">
        {/* Search / Home */}
        <Pressable className="items-center justify-center space-y-1 active:opacity-70">
          <Ionicons name="search-outline" size={22} color="white" />
          <Text className="text-xs font-medium text-white">Search</Text>
        </Pressable>

        {/* Favourites */}
        <Pressable className="items-center justify-center space-y-1 active:opacity-70">
          <MaterialIcons name="favorite-border" size={22} color="white" />
          <Text className="text-xs font-medium text-zinc-400">Favourites</Text>
        </Pressable>

        {/* Booking */}
        <Pressable className="items-center justify-center space-y-1 active:opacity-70">
          <Feather name="book-open" size={22} color="#a1a1aa" />
          <Text className="text-xs font-medium text-zinc-400">Booking</Text>
        </Pressable>

        {/* Inbox */}
        <Pressable className="items-center justify-center space-y-1 active:opacity-70">
          <Entypo name="chat" size={22} color="#a1a1aa" />
          <Text className="text-xs font-medium text-zinc-400">Inbox</Text>
        </Pressable>

        {/* Profile */}
        <Pressable className="items-center justify-center space-y-1 active:opacity-70">
          <Feather name="user" size={22} color="#a1a1aa" />
          <Text className="text-xs font-medium text-zinc-400">Profile</Text>
        </Pressable>
      </View>
    </View>
  );
}
