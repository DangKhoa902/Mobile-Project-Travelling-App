import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

export default function HomeScreen() {
  return (
    <ThemedView>
      <SafeAreaView edges={["top"]}>
        <ScrollView showsVerticalScrollIndicator={false}></ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
