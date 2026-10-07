import { ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

export default function ExploreScreen() {
  return (
    <ThemedView>
      <ScrollView showsVerticalScrollIndicator={false}></ScrollView>
    </ThemedView>
  );
}
