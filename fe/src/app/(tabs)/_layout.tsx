import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";

import { Colors } from "@/constants/theme";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { useUnreadCount } from "@/services/notification.service";

type IconName = keyof typeof Ionicons.glyphMap;

const TABS: { name: string; title: string; icon: IconName; activeIcon: IconName }[] = [
  { name: "index", title: "Khám phá", icon: "compass-outline", activeIcon: "compass" },
  { name: "favorites", title: "Yêu thích", icon: "heart-outline", activeIcon: "heart" },
  { name: "bookings", title: "Chuyến đi", icon: "airplane-outline", activeIcon: "airplane" },
  { name: "inbox", title: "Hộp thư", icon: "mail-outline", activeIcon: "mail" },
  { name: "profile", title: "Tài khoản", icon: "person-outline", activeIcon: "person" },
];

// 5 tab của khách. Mobile: thanh tab đáy; web ≥ 1024px: thanh bên trái.
export default function TabLayout() {
  const { isLg } = useBreakpoint();
  const unread = useUnreadCount();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: isLg ? "left" : "bottom",
        tabBarVariant: isLg ? "material" : "uikit",
        tabBarLabelPosition: isLg ? "beside-icon" : "below-icon",
        tabBarActiveTintColor: Colors.brand,
        tabBarInactiveTintColor: Colors.muted,
        tabBarStyle: { backgroundColor: Colors.card, borderColor: Colors.line, ...(isLg ? { width: 220, paddingTop: 16 } : {}) },
        tabBarLabelStyle: { fontSize: isLg ? 14 : 11, fontWeight: "600" },
      }}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, focused, size }) => <Ionicons name={focused ? tab.activeIcon : tab.icon} color={color} size={size} />,
            tabBarBadge: tab.name === "inbox" && unread.data ? (unread.data > 99 ? "99+" : unread.data) : undefined,
            tabBarAccessibilityLabel: tab.title,
          }}
        />
      ))}
    </Tabs>
  );
}
