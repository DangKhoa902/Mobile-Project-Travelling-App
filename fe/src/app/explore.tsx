import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const collections = [
  { icon: '🏖️', title: 'Biển & nghỉ dưỡng', subtitle: 'Tìm chút nắng và tiếng sóng', color: '#DCEDE7' },
  { icon: '⛰️', title: 'Núi rừng & trekking', subtitle: 'Chạm gần hơn với thiên nhiên', color: '#E5E9D8' },
  { icon: '🏮', title: 'Văn hóa & ẩm thực', subtitle: 'Nếm trọn câu chuyện địa phương', color: '#F2E5D4' },
  { icon: '🌆', title: 'Đi trốn cuối tuần', subtitle: 'Một chuyến đi ngắn cũng đủ vui', color: '#E6E1EF' },
];

export default function ExploreScreen() {
  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedText style={styles.kicker}>TÌM CẢM HỨNG</ThemedText>
        <ThemedText style={styles.title}>Khám phá</ThemedText>
        <ThemedText style={styles.subtitle}>Chọn một phong cách, rồi để chuyến đi dẫn lối.</ThemedText>

        <View style={styles.feature}>
          <View style={styles.featureText}>
            <ThemedText style={styles.featureKicker}>GỢI Ý TUẦN NÀY</ThemedText>
            <ThemedText style={styles.featureTitle}>Một chút bình yên ở miền Trung</ThemedText>
            <ThemedText style={styles.featureCaption}>Đà Nẵng · Sơn Trà · Hội An</ThemedText>
          </View>
          <ThemedText style={styles.featureIcon}>☀️</ThemedText>
        </View>

        <ThemedText style={styles.sectionTitle}>Khám phá theo sở thích</ThemedText>
        <View style={styles.list}>
          {collections.map((item) => (
            <View key={item.title} style={styles.collection}>
              <View style={[styles.collectionIcon, { backgroundColor: item.color }]}><ThemedText style={styles.icon}>{item.icon}</ThemedText></View>
              <View style={styles.collectionCopy}><ThemedText style={styles.collectionTitle}>{item.title}</ThemedText><ThemedText style={styles.collectionSubtitle}>{item.subtitle}</ThemedText></View>
              <ThemedText style={styles.arrow}>›</ThemedText>
            </View>
          ))}
        </View>
        <View style={styles.footer}><ThemedText style={styles.footerText}>Mỗi hành trình bắt đầu từ một ý tưởng.</ThemedText></View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F7F3' },
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: 22, paddingTop: 28, paddingBottom: 110 },
  kicker: { color: '#789185', fontSize: 10, letterSpacing: 1.8, fontWeight: '700' },
  title: { color: '#193B35', fontSize: 31, lineHeight: 40, fontWeight: '800', marginTop: 5 },
  subtitle: { color: '#7E8C85', fontSize: 13, lineHeight: 20, marginTop: 3 },
  feature: { minHeight: 148, borderRadius: 23, backgroundColor: '#DDEDE3', marginTop: 23, marginBottom: 28, padding: 18, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  featureText: { flex: 1, zIndex: 2 },
  featureKicker: { color: '#4D806B', fontSize: 9, letterSpacing: 1.4, fontWeight: '700' },
  featureTitle: { color: '#1C4438', fontSize: 19, lineHeight: 24, fontWeight: '700', marginTop: 8, maxWidth: 230 },
  featureCaption: { color: '#6C897A', fontSize: 10, marginTop: 7 },
  featureIcon: { fontSize: 60, marginRight: 5 },
  sectionTitle: { color: '#263F36', fontSize: 17, fontWeight: '700', marginBottom: 13 },
  list: { gap: 10 },
  collection: { minHeight: 75, borderRadius: 17, backgroundColor: '#fff', borderWidth: 1, borderColor: '#EEF0EB', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 12 },
  collectionIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 24 },
  collectionCopy: { flex: 1 },
  collectionTitle: { color: '#2B4038', fontSize: 13, fontWeight: '700' },
  collectionSubtitle: { color: '#8A9690', fontSize: 10, marginTop: 4 },
  arrow: { color: '#65917E', fontSize: 25, paddingHorizontal: 4 },
  footer: { marginTop: 24, padding: 17, borderRadius: 16, backgroundColor: '#EEF1E8', alignItems: 'center' },
  footerText: { color: '#74877B', fontSize: 11, fontStyle: 'italic' },
});
