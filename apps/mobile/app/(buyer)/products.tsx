import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Image, ScrollView, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useProducts, getProductImageUrl, type Product } from '../../src/hooks/useProducts';
import { useCartStore } from '../../src/store/cart.store';
import { Colors } from '../../src/constants/colors';

type SortOption = 'popular' | 'price_asc' | 'price_desc' | 'newest';

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: 'Popular', value: 'popular' },
  { label: 'Price ↑', value: 'price_asc' },
  { label: 'Price ↓', value: 'price_desc' },
  { label: 'Newest', value: 'newest' },
];

function ProductCard({ item }: { item: Product }) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const inCart = useCartStore((s) => s.items.some((i) => i.productId === item._id));
  const hasConflict = useCartStore((s) => s.hasConflict(item.supplierId?._id ?? ''));

  const thumbUrl = getProductImageUrl(item.images);

  function handleAdd() {
    if (hasConflict) {
      Alert.alert(
        'Different supplier',
        'Your cart has items from another supplier. Add anyway to create a separate order?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add anyway',
            onPress: () => addItem({
              productId: item._id,
              name: item.name,
              image: thumbUrl,
              unit: item.unit,
              basePrice: item.basePrice,
              gstRate: item.gstRate,
              supplierId: item.supplierId?._id ?? '',
              supplierName: item.supplierId?.businessName ?? '',
            }),
          },
        ]
      );
      return;
    }
    addItem({
      productId: item._id,
      name: item.name,
      image: thumbUrl,
      unit: item.unit,
      basePrice: item.basePrice,
      gstRate: item.gstRate,
      supplierId: item.supplierId?._id ?? '',
      supplierName: item.supplierId?.businessName ?? '',
    });
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/(buyer)/product/[id]', params: { id: item._id } })}
      activeOpacity={0.8}
    >
      <View style={styles.cardImg}>
        {thumbUrl ? (
          <Image source={{ uri: thumbUrl }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Text style={{ fontSize: 32 }}>🏗️</Text>
          </View>
        )}
        {item.isFeatured && (
          <View style={styles.featuredBadge}><Text style={styles.featuredText}>Featured</Text></View>
        )}
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.supplierName} numberOfLines={1}>{item.supplierId?.businessName}</Text>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>

        <View style={styles.priceRow}>
          <View>
            <Text style={styles.price}>₹{item.basePrice.toLocaleString('en-IN')}</Text>
            <Text style={styles.priceUnit}>per {item.unit} + {item.gstRate}% GST</Text>
          </View>
          <TouchableOpacity
            style={[styles.addBtn, inCart && styles.addBtnActive]}
            onPress={handleAdd}
          >
            <Text style={[styles.addBtnText, inCart && styles.addBtnTextActive]}>
              {inCart ? '✓' : '+'}
            </Text>
          </TouchableOpacity>
        </View>

        {(item.supplierId?.avgRating ?? 0) > 0 && (
          <Text style={styles.rating}>⭐ {item.supplierId.avgRating.toFixed(1)}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function ProductsScreen() {
  const { categorySlug, categoryName } = useLocalSearchParams<{ categorySlug: string; categoryName: string }>();
  const router = useRouter();
  const [sort, setSort] = useState<SortOption>('popular');

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch, isRefetching } =
    useProducts({ category: categorySlug, sort });

  const cartCount = useCartStore((s) => s.itemCount());

  // Flatten all pages into a single product list
  const products = data?.pages.flatMap((p) => p.products) ?? [];
  const total = data?.pages[0]?.pagination.total ?? 0;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{categoryName ?? 'Products'}</Text>
        <TouchableOpacity style={styles.cartBtn} onPress={() => router.push('/(buyer)/cart' as never)}>
          <Text style={styles.cartIcon}>🛒</Text>
          {cartCount > 0 && (
            <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{cartCount}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      {/* Sort chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {SORT_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, sort === opt.value && styles.chipActive]}
            onPress={() => setSort(opt.value)}
          >
            <Text style={[styles.chipText, sort === opt.value && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : products.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>📦</Text>
          <Text style={styles.emptyTitle}>No products yet</Text>
          <Text style={styles.emptySub}>Suppliers are being onboarded for this category.</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <ProductCard item={item} />}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />
          }
          ListHeaderComponent={
            total > 0 ? (
              <Text style={styles.totalCount}>{total} products</Text>
            ) : null
          }
          ListFooterComponent={
            hasNextPage ? (
              <TouchableOpacity
                style={styles.loadMore}
                onPress={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <ActivityIndicator color={Colors.primary} />
                ) : (
                  <Text style={styles.loadMoreText}>Load more</Text>
                )}
              </TouchableOpacity>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { padding: 4, marginRight: 8 },
  backIcon: { fontSize: 20, color: Colors.text },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: Colors.text },
  cartBtn: { position: 'relative', padding: 4 },
  cartIcon: { fontSize: 22 },
  cartBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: Colors.primary, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  cartBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  chips: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  list: { paddingHorizontal: 12, paddingBottom: 24 },
  row: { justifyContent: 'space-between', marginBottom: 12 },
  totalCount: { fontSize: 12, color: Colors.textMuted, paddingHorizontal: 4, paddingVertical: 8 },
  card: { width: '48.5%', backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  cardImg: { position: 'relative' },
  thumb: { width: '100%', height: 130 },
  thumbPlaceholder: { width: '100%', height: 130, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  featuredBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: Colors.primary, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  featuredText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  cardBody: { padding: 10 },
  supplierName: { fontSize: 10, color: Colors.textMuted, marginBottom: 2 },
  productName: { fontSize: 13, fontWeight: '600', color: Colors.text, lineHeight: 18, marginBottom: 8 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  price: { fontSize: 15, fontWeight: '800', color: Colors.text },
  priceUnit: { fontSize: 10, color: Colors.textMuted, marginTop: 1 },
  addBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  addBtnActive: { backgroundColor: Colors.primary },
  addBtnText: { fontSize: 16, color: Colors.primary, fontWeight: '700', lineHeight: 20 },
  addBtnTextActive: { color: '#fff' },
  rating: { fontSize: 11, color: Colors.textMuted, marginTop: 6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptySub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  loadMore: { marginHorizontal: 16, marginVertical: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: Colors.primary, alignItems: 'center' },
  loadMoreText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
});
