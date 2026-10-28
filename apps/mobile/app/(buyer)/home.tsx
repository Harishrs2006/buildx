import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/auth.store';
import { useOrders } from '../../src/hooks/useOrders';
import { useCategories } from '../../src/hooks/useProducts';
import { useCartStore } from '../../src/store/cart.store';
import { Colors } from '../../src/constants/colors';
import { Button, Eyebrow, type } from '../../src/components/ui';

// Category photos are the same ones the website uses (apps/buyer-web/public/categories)
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://buildx-vgud.vercel.app';
const categoryPhoto = (slug: string) => `${WEB_URL}/categories/${slug}.jpg`;

export default function BuyerHome() {
  const { user } = useAuthStore();
  const router = useRouter();
  const cartCount = useCartStore((s) => s.itemCount());
  const { data: ordersData } = useOrders();
  const categories = useCategories();
  const activeOrders = (ordersData?.data ?? []).filter((o) => !['DELIVERED', 'CANCELLED'].includes(o.status));
  const firstName = user?.name?.split(' ')[0];

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.flex}>
            <Eyebrow>{firstName ? `Hello, ${firstName}` : 'Welcome'}</Eyebrow>
            <Text style={[type.title, styles.headerTitle]}>What does the site need?</Text>
          </View>
          <Pressable
            style={styles.cartBtn}
            onPress={() => router.push('/(buyer)/cart' as never)}
            accessibilityRole="button"
            accessibilityLabel={cartCount > 0 ? `Cart, ${cartCount} items` : 'Cart'}
          >
            <Text style={styles.cartText}>Cart</Text>
            {cartCount > 0 && (
              <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{cartCount}</Text></View>
            )}
          </Pressable>
        </View>

        <Pressable style={styles.search} onPress={() => router.push('/(buyer)/search')} accessibilityRole="search">
          <Text style={styles.searchGlyph}>⌕</Text>
          <Text style={styles.searchText}>Search cement, TMT, bricks…</Text>
        </Pressable>

        {activeOrders.length > 0 && (
          <Pressable style={styles.active} onPress={() => router.push('/(buyer)/orders' as never)} accessibilityRole="button">
            <View style={styles.activeDot} />
            <View style={styles.flex}>
              <Text style={styles.activeTitle}>
                {activeOrders.length} order{activeOrders.length > 1 ? 's' : ''} in progress
              </Text>
              <Text style={styles.activeSub}>Track every status change</Text>
            </View>
            <Text style={styles.activeArrow}>›</Text>
          </Pressable>
        )}

        <View style={styles.hero}>
          <Eyebrow color={Colors.lime}>Construction materials marketplace</Eyebrow>
          <Text style={styles.heroTitle}>
            Build better.{'\n'}
            <Text style={styles.heroAccent}>Order materials in minutes.</Text>
          </Text>
          <Text style={styles.heroBody}>From verified suppliers who deliver to your site PIN. Pay cash on delivery.</Text>
          <Button title="Search materials" variant="lime" onPress={() => router.push('/(buyer)/search')} style={styles.heroCta} />
        </View>

        <View style={styles.sectionHead}>
          <Eyebrow>The catalogue</Eyebrow>
          <Text style={[type.title, styles.sectionTitle]}>Shop by category</Text>
        </View>

        {categories.isLoading && <ActivityIndicator color={Colors.ink} style={styles.loading} />}
        {categories.isError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>We could not load the catalogue</Text>
            <Text style={type.body}>Check your connection and try again.</Text>
            <Button title="Try again" variant="ghost" onPress={() => categories.refetch()} style={styles.retry} />
          </View>
        )}
        {categories.data && (
          <View style={styles.grid}>
            {categories.data.map((cat) => (
              <Pressable
                key={cat._id}
                style={({ pressed }) => [styles.cat, pressed && styles.catPressed]}
                onPress={() => router.push({ pathname: '/(buyer)/products', params: { categorySlug: cat.slug, categoryName: cat.name } })}
                accessibilityRole="button"
                accessibilityLabel={cat.name}
              >
                <Image source={{ uri: categoryPhoto(cat.slug) }} style={styles.catPhoto} contentFit="cover" transition={200} />
                <Text style={styles.catName} numberOfLines={2}>{cat.name}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.sand },
  flex: { flex: 1 },
  content: { paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingHorizontal: 20, paddingTop: 12 },
  headerTitle: { marginTop: 6 },
  cartBtn: { height: 44, minWidth: 64, paddingHorizontal: 16, borderRadius: 22, backgroundColor: Colors.ink, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  cartText: { color: Colors.sand, fontSize: 14, fontWeight: '700' },
  cartBadge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: Colors.lime, alignItems: 'center', justifyContent: 'center' },
  cartBadgeText: { color: Colors.ink, fontSize: 11, fontWeight: '800' },
  search: { marginHorizontal: 20, marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, borderRadius: 26, paddingHorizontal: 18, backgroundColor: Colors.sand2, borderWidth: 1, borderColor: Colors.sand4 },
  searchGlyph: { fontSize: 22, color: Colors.stone, marginTop: -2 },
  searchText: { fontSize: 15, color: Colors.stone },
  active: { marginHorizontal: 20, marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, backgroundColor: Colors.cobaltSoft },
  activeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.cobalt },
  activeTitle: { fontSize: 15, fontWeight: '700', color: Colors.ink },
  activeSub: { fontSize: 13, color: '#0F2A8A', marginTop: 2 },
  activeArrow: { fontSize: 26, color: '#0F2A8A' },
  hero: { marginHorizontal: 20, marginTop: 18, padding: 22, borderRadius: 26, backgroundColor: Colors.ink },
  heroTitle: { marginTop: 12, fontSize: 30, lineHeight: 32, fontWeight: '800', letterSpacing: -1, color: Colors.sand },
  heroAccent: { color: Colors.lime, fontStyle: 'italic', fontWeight: '400' },
  heroBody: { marginTop: 12, fontSize: 15, lineHeight: 22, color: 'rgba(242,239,231,0.72)' },
  heroCta: { marginTop: 18, alignSelf: 'flex-start' },
  sectionHead: { marginTop: 30, marginHorizontal: 20 },
  sectionTitle: { marginTop: 6 },
  loading: { marginTop: 30 },
  errorBox: { marginHorizontal: 20, marginTop: 16, padding: 20, borderRadius: 18, backgroundColor: Colors.sand2, borderWidth: 1, borderColor: Colors.sand4, alignItems: 'flex-start' },
  errorTitle: { fontSize: 18, fontWeight: '700', color: Colors.ink, marginBottom: 4 },
  retry: { marginTop: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 20, marginTop: 16 },
  cat: { width: '47.8%', borderRadius: 18, overflow: 'hidden', backgroundColor: Colors.sand2, borderWidth: 1, borderColor: Colors.sand4 },
  catPressed: { transform: [{ scale: 0.98 }], borderColor: Colors.ink },
  catPhoto: { width: '100%', aspectRatio: 3 / 2, backgroundColor: Colors.sand3 },
  catName: { paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, lineHeight: 19, fontWeight: '700', color: Colors.ink },
});
