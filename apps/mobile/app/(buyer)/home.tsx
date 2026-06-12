import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/auth.store';
import { Colors } from '../../src/constants/colors';

const CATEGORIES = [
  { id: 'materials', name: 'Materials', emoji: '🪨', slug: 'materials' },
  { id: 'core', name: 'Core Materials', emoji: '🧱', slug: 'core-materials' },
  { id: 'plumbing', name: 'Plumbing', emoji: '🚰', slug: 'plumbing' },
  { id: 'electricals', name: 'Electricals', emoji: '⚡', slug: 'electricals' },
  { id: 'machines', name: 'Machines & Tools', emoji: '⚙️', slug: 'machines-tools' },
  { id: 'services', name: 'Services', emoji: '🛠️', slug: 'services' },
  { id: 'vehicles', name: 'Vehicles', emoji: '🚛', slug: 'vehicles' },
  { id: 'paints', name: 'Paints', emoji: '🎨', slug: 'paints' },
  { id: 'hardware', name: 'Hardware', emoji: '🔩', slug: 'hardware' },
  { id: 'plywood', name: 'Plywood & Interiors', emoji: '🪵', slug: 'plywood-interiors' },
];

export default function BuyerHome() {
  const { user } = useAuthStore();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]} 👋</Text>
            <Text style={styles.tagline}>SURFACE THE ESSENTIALS</Text>
          </View>
        </View>

        {/* Search bar */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => router.push('/(buyer)/search')}
          activeOpacity={0.8}
        >
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchPlaceholder}>Search cement, sand, bricks...</Text>
        </TouchableOpacity>

        {/* Promo banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerTag}>NEW</Text>
          <Text style={styles.bannerTitle}>HEAVY MACHINERY{'\n'}RENTALS NOW OPEN</Text>
          <Text style={styles.bannerSub}>JCBs, mixers & more in Tumakuru</Text>
          <TouchableOpacity style={styles.bannerBtn}>
            <Text style={styles.bannerBtnText}>EXPLORE FLEET →</Text>
          </TouchableOpacity>
        </View>

        {/* Categories grid */}
        <Text style={styles.sectionTitle}>All Categories</Text>
        <View style={styles.grid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={styles.catCard}
              onPress={() => router.push({ pathname: '/(buyer)/products', params: { categorySlug: cat.slug, categoryName: cat.name } })}
              activeOpacity={0.75}
            >
              <Text style={styles.catEmoji}>{cat.emoji}</Text>
              <Text style={styles.catName}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontSize: 16, color: Colors.textSecondary, marginBottom: 2 },
  tagline: { fontSize: 22, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  searchBar: {
    marginHorizontal: 20, marginBottom: 16, flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceAlt, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 13,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchPlaceholder: { fontSize: 14, color: Colors.textMuted },
  banner: {
    marginHorizontal: 20, marginBottom: 24, borderRadius: 16, padding: 20,
    backgroundColor: Colors.text,
  },
  bannerTag: { fontSize: 10, fontWeight: '800', color: Colors.primary, letterSpacing: 1, marginBottom: 6 },
  bannerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', lineHeight: 28, marginBottom: 6 },
  bannerSub: { fontSize: 13, color: '#9CA3AF', marginBottom: 16 },
  bannerBtn: { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9, alignSelf: 'flex-start' },
  bannerBtnText: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginHorizontal: 20, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, paddingBottom: 24 },
  catCard: {
    width: '47%', backgroundColor: Colors.surfaceAlt, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border, padding: 16, alignItems: 'center',
  },
  catEmoji: { fontSize: 32, marginBottom: 10 },
  catName: { fontSize: 12, fontWeight: '600', color: Colors.text, textAlign: 'center', lineHeight: 16 },
});
