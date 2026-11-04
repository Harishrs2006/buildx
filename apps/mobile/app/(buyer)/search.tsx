import { View, Text, TextInput, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useProductSearch, getProductImageUrl, type Product } from '../../src/hooks/useProducts';
import { useCartStore } from '../../src/store/cart.store';
import { Colors } from '../../src/constants/colors';
import { Font } from '../../src/constants/typography';
import { Button, EmptyState, Eyebrow, Icon } from '../../src/components/ui';
import { CartButton } from '../../src/components/CartButton';
import { useAddToCart } from '../../src/components/useAddToCart';

const SUGGESTIONS = ['Cement', 'Sand', 'Bricks', 'Steel', 'JCB rental', 'Plywood', 'PVC pipes', 'Paint'];

function ResultRow({ item, onAdd }: { item: Product; onAdd: (p: Product) => void }) {
  const router = useRouter();
  const inCart = useCartStore((s) => s.items.some((i) => i.productId === item._id));
  const thumbUrl = getProductImageUrl(item.images);
  const outOfStock = item.stockQuantity <= 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => router.push({ pathname: '/(buyer)/product/[id]', params: { id: item._id } })}
      accessibilityRole="button"
      accessibilityLabel={item.name}
    >
      {thumbUrl ? (
        <Image source={{ uri: thumbUrl }} style={styles.thumb} contentFit="cover" transition={150} />
      ) : (
        <View style={[styles.thumb, styles.thumbEmpty]}><Icon name="package-variant-closed" size={24} color={Colors.stone} /></View>
      )}
      <View style={styles.rowBody}>
        <Text style={styles.supplier} numberOfLines={1}>{item.supplierId?.businessName}</Text>
        <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.price}>
          ₹{item.basePrice.toLocaleString('en-IN')} <Text style={styles.unit}>/ {item.unit}</Text>
        </Text>
        {outOfStock ? <Text style={styles.oos}>Out of stock</Text> : null}
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
    </Pressable>
  );
}

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const { add, sheet } = useAddToCart();

  const { data, isLoading, isError, refetch } = useProductSearch(query);
  const searching = query.trim().length >= 2;
  const products = searching ? (data?.products ?? []) : [];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back">
          <Icon name="arrow-left" size={22} />
        </Pressable>
        <View style={styles.field}>
          <Icon name="magnify" size={20} color={Colors.stone} />
          <TextInput
            style={styles.input}
            placeholder="Cement, JCB, pipes…"
            placeholderTextColor={Colors.stoneLight}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoFocus
            accessibilityLabel="Search materials"
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
              <Icon name="close-circle" size={18} color={Colors.stone} />
            </Pressable>
          ) : null}
        </View>
        <CartButton />
      </View>

      {!searching ? (
        <View style={styles.suggestions}>
          <Eyebrow>Try searching for</Eyebrow>
          <View style={styles.chips}>
            {SUGGESTIONS.map((s) => (
              <Pressable key={s} style={styles.chip} onPress={() => setQuery(s)} accessibilityRole="button">
                <Text style={styles.chipText}>{s}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : isLoading ? (
        <ActivityIndicator color={Colors.ink} style={styles.loading} />
      ) : isError ? (
        <EmptyState
          icon="wifi-off"
          title="Search did not work"
          body="Check your connection and try again."
          action={<Button title="Try again" variant="ghost" onPress={() => refetch()} />}
        />
      ) : products.length === 0 ? (
        <EmptyState
          icon="magnify-close"
          title={`Nothing for "${query.trim()}"`}
          body="Try a different word, or browse the categories."
          action={<Button title="Browse categories" variant="ghost" onPress={() => router.back()} />}
        />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <ResultRow item={item} onAdd={add} />}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <Text style={styles.count}>
              {data?.pagination.total ?? products.length} result{(data?.pagination.total ?? products.length) === 1 ? '' : 's'}
            </Text>
          }
        />
      )}
      {sheet}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.sand },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.sand2, borderWidth: 1, borderColor: Colors.sand4, alignItems: 'center', justifyContent: 'center' },
  field: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, borderRadius: 24, paddingHorizontal: 14, backgroundColor: Colors.sand2, borderWidth: 1.5, borderColor: Colors.ink },
  input: { fontFamily: Font.regular, flex: 1, fontSize: 16, color: Colors.ink, paddingVertical: 0 },
  loading: { marginTop: 40 },
  suggestions: { paddingHorizontal: 20, paddingTop: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { height: 40, paddingHorizontal: 16, borderRadius: 20, backgroundColor: Colors.sand2, borderWidth: 1, borderColor: Colors.sand4, justifyContent: 'center' },
  chipText: { fontFamily: Font.semiBold, fontSize: 14, color: Colors.ink },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  count: { fontFamily: Font.mono, fontSize: 11, letterSpacing: 1, color: Colors.stone, textTransform: 'uppercase', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 18, backgroundColor: Colors.sand2, borderWidth: 1, borderColor: Colors.sand4 },
  rowPressed: { borderColor: Colors.ink },
  thumb: { width: 72, height: 72, borderRadius: 12, backgroundColor: Colors.sand3 },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1 },
  supplier: { fontFamily: Font.mono, fontSize: 10, letterSpacing: 0.5, color: Colors.stone, textTransform: 'uppercase' },
  name: { fontFamily: Font.semiBold, fontSize: 15, lineHeight: 20, color: Colors.ink, marginTop: 2 },
  price: { fontFamily: Font.bold, fontSize: 15, color: Colors.ink, marginTop: 4 },
  unit: { fontFamily: Font.regular, fontSize: 13, color: Colors.stone },
  oos: { fontFamily: Font.semiBold, fontSize: 12, color: Colors.error, marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.ink, alignItems: 'center', justifyContent: 'center' },
  addBtnOn: { backgroundColor: Colors.lime },
});
