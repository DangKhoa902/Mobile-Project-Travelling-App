import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const destinations = [
  { name: 'Đà Nẵng', detail: 'Biển xanh · 3 ngày', color: '#C9E5DC', mark: '🌊' },
  { name: 'Đà Lạt', detail: 'Trốn phố · 2 ngày', color: '#E5DCCB', mark: '🌿' },
  { name: 'Hội An', detail: 'Phố cổ · 1 ngày', color: '#F0DDC8', mark: '🏮' },
];

export default function HomeScreen() {
  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <View>
              <ThemedText style={styles.eyebrow}>THỨ HỨNG KHỞI, CHUYẾN ĐI MỚI</ThemedText>
              <ThemedText style={styles.greeting}>Chào bạn 👋</ThemedText>
            </View>
            <View style={styles.avatar}><ThemedText style={styles.avatarText}>✦</ThemedText></View>
          </View>

          <View style={styles.searchBox}>
            <ThemedText style={styles.searchIcon}>⌕</ThemedText>
            <ThemedText style={styles.searchHint}>Bạn muốn đi đâu?</ThemedText>
            <View style={styles.filter}><ThemedText style={styles.filterText}>☷</ThemedText></View>
          </View>

          <View style={styles.hero}>
            <View style={styles.heroCopy}>
              <ThemedText style={styles.heroKicker}>ĐI ĐỂ THẤY</ThemedText>
              <ThemedText style={styles.heroTitle}>Thế giới{ '\n' }đang chờ bạn</ThemedText>
              <ThemedText style={styles.heroCaption}>Lên đường, theo cách của riêng bạn.</ThemedText>
              <View style={styles.heroButton}><ThemedText style={styles.heroButtonText}>Khám phá ngay  →</ThemedText></View>
            </View>
            <View style={styles.sun} />
            <View style={styles.mountainBack} />
            <View style={styles.mountainFront} />
            <View style={styles.heroBadge}><ThemedText style={styles.badgeText}>✈  LET’S GO</ThemedText></View>
          </View>

          <View style={styles.sectionHeading}>
            <View><ThemedText style={styles.sectionTitle}>Điểm đến nổi bật</ThemedText><ThemedText style={styles.sectionSub}>Những nơi đáng để xách ba lô lên</ThemedText></View>
            <ThemedText style={styles.seeAll}>Xem tất cả  ›</ThemedText>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards}>
            {destinations.map((destination, index) => (
              <View key={destination.name} style={[styles.destinationCard, index === 0 && styles.firstCard]}>
                <View style={[styles.destinationArt, { backgroundColor: destination.color }]}>
                  <ThemedText style={styles.destinationMark}>{destination.mark}</ThemedText>
                  <View style={styles.heart}><ThemedText style={styles.heartText}>♡</ThemedText></View>
                  <View style={styles.cardLabel}><ThemedText style={styles.cardLabelText}>ĐƯỢC YÊU THÍCH</ThemedText></View>
                </View>
                <ThemedText style={styles.destinationName}>{destination.name}</ThemedText>
                <ThemedText style={styles.destinationDetail}>{destination.detail}</ThemedText>
              </View>
            ))}
          </ScrollView>

          <View style={styles.tipCard}>
            <View style={styles.tipIcon}><ThemedText style={styles.tipIconText}>✧</ThemedText></View>
            <View style={styles.tipCopy}><ThemedText style={styles.tipTitle}>Chuyến đi của bạn</ThemedText><ThemedText style={styles.tipSub}>Lưu lại những nơi bạn muốn ghé thăm.</ThemedText></View>
            <ThemedText style={styles.tipArrow}>→</ThemedText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F7F3' },
  safeArea: { flex: 1, alignItems: 'center' },
  content: { width: '100%', maxWidth: 680, paddingHorizontal: 22, paddingTop: 16, paddingBottom: 116, gap: 22 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: '#81918B', fontSize: 10, letterSpacing: 1.5, fontWeight: '700' },
  greeting: { color: '#193B35', fontSize: 27, lineHeight: 35, fontWeight: '700', marginTop: 3 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#DDEBE3', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#2B7864', fontSize: 22 },
  searchBox: { minHeight: 54, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ECEEE9', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 },
  searchIcon: { color: '#39836D', fontSize: 26, lineHeight: 30 },
  searchHint: { color: '#9AA39E', fontSize: 14, flex: 1 },
  filter: { height: 34, width: 36, borderRadius: 11, backgroundColor: '#EAF3EE', alignItems: 'center', justifyContent: 'center' },
  filterText: { color: '#397A67', fontSize: 19 },
  hero: { minHeight: 226, borderRadius: 25, overflow: 'hidden', backgroundColor: '#DCEDE3', justifyContent: 'center', padding: 22 },
  heroCopy: { zIndex: 3, maxWidth: '78%' },
  heroKicker: { color: '#4D826E', fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  heroTitle: { color: '#173D34', fontSize: 29, lineHeight: 34, fontWeight: '800', marginTop: 8 },
  heroCaption: { color: '#56766B', fontSize: 12, marginTop: 6 },
  heroButton: { alignSelf: 'flex-start', borderRadius: 12, backgroundColor: '#287561', paddingVertical: 10, paddingHorizontal: 13, marginTop: 15 },
  heroButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  sun: { position: 'absolute', width: 92, height: 92, borderRadius: 46, backgroundColor: '#F5CE8B', right: 22, top: 27 },
  mountainBack: { position: 'absolute', width: 180, height: 135, right: -22, bottom: -47, backgroundColor: '#98C6AC', borderRadius: 30, transform: [{ rotate: '43deg' }] },
  mountainFront: { position: 'absolute', width: 155, height: 116, right: 62, bottom: -65, backgroundColor: '#68A88E', borderRadius: 28, transform: [{ rotate: '43deg' }] },
  heroBadge: { position: 'absolute', right: 17, bottom: 20, borderRadius: 11, backgroundColor: '#FFFFFFD9', paddingHorizontal: 10, paddingVertical: 7, zIndex: 3 },
  badgeText: { fontSize: 9, color: '#33725F', letterSpacing: 1, fontWeight: '700' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: '#203C35', fontSize: 19, fontWeight: '700' },
  sectionSub: { color: '#89948E', fontSize: 11, marginTop: 3 },
  seeAll: { color: '#39816D', fontSize: 11, fontWeight: '700' },
  cards: { gap: 13, paddingRight: 22 },
  destinationCard: { width: 164, padding: 8, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#EEF0EB' },
  firstCard: { marginLeft: 0 },
  destinationArt: { height: 112, borderRadius: 13, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  destinationMark: { fontSize: 43 },
  heart: { position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFFFFFE8', alignItems: 'center', justifyContent: 'center' },
  heartText: { color: '#397E6B', fontSize: 17, lineHeight: 21 },
  cardLabel: { position: 'absolute', bottom: 7, left: 7, borderRadius: 7, backgroundColor: '#FFFFFFE8', paddingVertical: 4, paddingHorizontal: 6 },
  cardLabelText: { fontSize: 7, color: '#47816D', letterSpacing: 0.5, fontWeight: '700' },
  destinationName: { color: '#253D36', fontSize: 14, fontWeight: '700', marginTop: 9 },
  destinationDetail: { color: '#8B9690', fontSize: 10, marginTop: 3, marginBottom: 3 },
  tipCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 17, backgroundColor: '#EAF2EC' },
  tipIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: '#D6E8DB', alignItems: 'center', justifyContent: 'center' },
  tipIconText: { color: '#397C67', fontSize: 22 },
  tipCopy: { flex: 1 },
  tipTitle: { color: '#2A4E41', fontSize: 13, fontWeight: '700' },
  tipSub: { color: '#71877B', fontSize: 10, marginTop: 3 },
  tipArrow: { color: '#47836D', fontSize: 19, paddingHorizontal: 3 },
});
