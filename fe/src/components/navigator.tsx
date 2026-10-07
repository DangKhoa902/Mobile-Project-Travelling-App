import { Icon } from "expo-router";
import { Text } from "expo-router/build/react-navigation";
import { View } from "react-native-reanimated/lib/typescript/Animated";

export function navigator() {
  return (
    <View>
      <View>
        <image></image>
        <Text>Search</Text>
      </View>
      <View>
        <Icon></Icon>
        <Text>Favorites</Text>
      </View>
      <View>
        <Icon></Icon>
        <Text>Bookings</Text>
      </View>
      <View>
        <Icon></Icon>
        <Text>Inbox</Text>
      </View>
      <View>
        <Icon></Icon>
        <Text>Profile</Text>
      </View>
    </View>
  );
}
