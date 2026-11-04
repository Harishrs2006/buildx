import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useProducts, getProductImageUrl, type Product } from '../../src/hooks/useProducts';
import { useCartStore } from '../../src/store/cart.store';
import { Colors } from '../../src/constants/colors';
import { Font } from '../../src/constants/typography';
import { Button, EmptyState, Icon, ScreenHeader } from '../../src/components/ui';
import { CartButton } from '../../src/components/CartButton';
import { useAddToCart } from '../../src/components/useAddToCart';

type SortOption = 'popular' | 'price_asc' | 'price_desc' | 'newest';

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: 'Popular', value: 'popular' },
  { label: 'Lowest price', value: 'price_asc' },
  { label: 'Highest price', value: 'price_desc' },
  { label: 'Newest', value: 'newest' },
];

function ProductCard({ item, onAdd }: { item: Product; onAdd: (p: Product) => void }) {
  const router = useRouter();
  const inCart = useCartStore((s) => s.items.some((i) => i.productId === item._id));
  const thumbUrl = getProductImageUrl(item.images);
  const outOfStock = item.stockQuantity <= 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push({ pathname: '/(buyer)/product/[id]', params: { id: item._id } })}
      accessibilityRole="button"
      accessibilityLabel={item.name}
    >
      <View style={styles.cardImg}>
        {thumbUrl ? (
          <Image source={{ uri: thumbUrl }} style={styles.thumb} contentFit="cover" transition={150} />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty]}><Icon name="package-variant-closed" size={32} color={Colors.stone} /></View>
        )}
        {item.isFeatured ? <View style={styles.featured}><Text style={styles.featuredText}>FEATURED</Text></View> : null}
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.supplier} numberOfLines={1}>{item.supplierId?.businessName}</Text>
        <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
        <View style={styles.priceRow}>
          <View style={styles.flex}>
            <Text style={styles.price}>₹{item.basePrice.toLocaleString('en-IN')}</Text>
            <Text style={styles.unit} numberOfLines={1}>
              per {item.unit} · {item.isGstInclusive ? 'incl.' : `+${item.gstRate}%`} GST
            </Text>
          </View>
          {outOfStock ? null : (
            <Pressable
              style={[styles.addBtn, inCart && styles.addBtnOn]}
              onPress={() => onAdd(item)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={inCart ? `Add another ${item.name}` : `Add ${item.name} to cart`}
            >
              <Icon name={inCart ? 'check' : 'plus'} size={20} color={inCart ? Colors.ink : Colors.sand} />
            </Pressable>
          )}
        </View>
        {outOfStock ? <Text style={styles.oos}>Out of stock</Text> : null}
      </View>
    </Pressable>
  );
}

export default function ProductsScreen() {
  const { categorySlug, categoryName } = useLocalSearchParams<{ categorySlug: string; categoryName: string }>();
  const router = useRouter();
  const [sort, setSort] = useState<SortOption>('popular');
  const { add, sheet } = useAddToCart();

  const { data, isLoading, isError, isFetchingNextPage, hasNextPage, fetchNextPage, refetch, isRefetching } =
    useProducts({ category: categorySlug, sort });

  const products = data?.pages.flatMap((p) => p.products) ?? [];
  const total = data?.pages[0]?.pagination.total ?? 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        eyebrow={total > 0 ? `${total} product${total === 1 ? '' : 's'}` : 'Category'}
        title={categoryName ?? 'Products'}
        onBack={() => router.back()}
        right={<CartButton />}
      />

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {SORT_OPTIONS.map((opt) => {
            const on = sort === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.chip, on && styles.chipOn]}
                onPress={() => setSort(opt.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.ink} style={styles.loading} />
      ) : isError ? (
        <EmptyState
          icon="wifi-off"
          title="We could not load products"
          body="Check your connection and try again."
          action={<Button title="Try again" variant="ghost" onPress={() => refetch()} />}
        />
      ) : products.length === 0 ? (
        <EmptyState icon="package-variant" title="Nothing listed here yet" body="No supplier has listed a product in this category yet." />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <ProductCard item={item} onAdd={add} />}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.ink} />}
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={Colors.ink} style={styles.more} /> : null}
        />
      )}
      {sheet}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.sand },
  flex: { flex: 1 },
  loading: { marginTop: 40 },
  chips: { paddingHorizontal: 20, gap: 8, paddingBottom: 12 },
  chip: { height: 38, paddingHorizontal: 14, borderRadius: 19, borderWidth: 1, borderColor: Colors.sand4, backgroundColor: Colors.sand2, justifyContent: 'center' },
  chipOn: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  chipText: { fontFamily: Font.semiBold, fontSize: 13, color: Colors.ink },
  chipTextOn: { color: Colors.sand },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  row: { gap: 12, marginBottom: 12 },
  card: { flex: 1, borderRadius: 18, overflow: 'hidden', backgroundColor: Colors.sand2, borderWidth: 1, borderColor: Colors.sand4 },
  cardPressed: { borderColor: Colors.ink, transform: [{ scale: 0.98 }] },
  cardImg: { position: 'relative' },
  thumb: { width: '100%', aspectRatio: 1, backgroundColor: Colors.sand3 },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  featured: { position: 'absolute', top: 8, left: 8, backgroundColor: Colors.lime, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  featuredText: { fontFamily: Font.monoBold, fontSize: 9, letterSpacing: 1, color: Colors.ink },
  cardBody: { padding: 12 },
  supplier: { fontFamily: Font.mono, fontSize: 10, letterSpacing: 0.5, color: Colors.stone, textTransform: 'uppercase' },
  name: { fontFamily: Font.semiBold, fontSize: 14, lineHeight: 19, color: Colors.ink, marginTop: 4, minHeight: 38 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8 },
  price: { fontFamily: Font.display, fontSize: 18, color: Colors.ink },
  unit: { fontFamily: Font.regular, fontSize: 11, color: Colors.stone, marginTop: 1 },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.ink, alignItems: 'center', justifyContent: 'center' },
  addBtnOn: { backgroundColor: Colors.lime },
  oos: { fontFamily: Font.semiBold, fontSize: 12, color: Colors.error, marginTop: 6 },
  more: { marginVertical: 16 },
});
