import Ionicons from "@expo/vector-icons/Ionicons";
import Feather from "@expo/vector-icons/Feather";
import Entypo from "@expo/vector-icons/Entypo";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, Text, View } from "react-native";

export function Navigator() {
  return (
    <View>
      <View>
        <Pressable>
          <Ionicons name="home" size={24} color="black" />
          <Text>Search</Text>
        </Pressable>
        <Pressable>
          <MaterialIcons name="favorite-border" size={24} color="black" />
          <Text>Favourites</Text>
        </Pressable>
        <Pressable>
          <Feather name="book" size={24} color="black" />
          <Text>Booking</Text>
        </Pressable>
        <Pressable>
          <Entypo name="chat" size={24} color="black" />
          <Text>Inbox</Text>
        </Pressable>
        <Pressable>
          <Feather name="user" size={24} color="black" />
          <Text>Profile</Text>
        </Pressable>
      </View>
    </View>
  );
}
