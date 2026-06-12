import {
  View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useRef } from 'react';
import { useProducts, type Product } from '../../src/hooks/useProducts';
import { useCartStore } from '../../src/store/cart.store';
import { Colors } from '../../src/constants/colors';

const SUGGESTIONS = ['Cement', 'Sand', 'Bricks', 'Steel', 'JCB Rental', 'Plywood', 'PVC Pipes', 'Paint'];

function SearchProductCard({ item }: { item: Product }) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const inCart = useCartStore((s) => s.items.some((i) => i.productId === item._id));

  return (
    <TouchableOpacity
      style={styles.resultCard}
      onPress={() => router.push({ pathname: '/(buyer)/product/[id]', params: { id: item._id } })}
      activeOpacity={0.8}
    >
      {item.images?.[0] ? (
        <Image source={{ uri: item.images[0] }} style={styles.resultThumb} resizeMode="cover" />
      ) : (
        <View style={styles.resultThumbPlaceholder}><Text style={{ fontSize: 20 }}>🏗️</Text></View>
      )}
      <View style={styles.resultBody}>
        <Text style={styles.resultSupplier} numberOfLines={1}>{item.supplierId?.businessName}</Text>
        <Text style={styles.resultName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.resultPrice}>₹{item.basePrice.toLocaleString('en-IN')} / {item.unit}</Text>
      </View>
      <TouchableOpacity
        style={[styles.resultAddBtn, inCart && styles.resultAddBtnActive]}
        onPress={() => addItem({
          productId: item._id,
          name: item.name,
          image: item.images?.[0] ?? '',
          unit: item.unit,
          basePrice: item.basePrice,
          supplierId: item.supplierId?._id ?? '',
          supplierName: item.supplierId?.businessName ?? '',
        })}
      >
        <Text style={[styles.resultAddBtnText, inCart && { color: '#fff' }]}>{inCart ? '✓' : '+'}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function SearchScreen() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [committed, setCommitted] = useState('');

  const { data, isLoading } = useProducts({ q: committed });
  const products = committed ? (data?.products ?? []) : [];
  const cartCount = useCartStore((s) => s.itemCount());

  function submit(text?: string) {
    const q = (text ?? query).trim();
    if (q) setCommitted(q);
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Search bar row */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Search cement, JCB, pipes..."
          placeholderTextColor={Colors.textMuted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => submit()}
          returnKeyType="search"
          autoFocus
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setCommitted(''); }} style={styles.clearBtn}>
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.cartBtn} onPress={() => router.push('/(buyer)/cart' as never)}>
          <Text style={styles.cartIcon}>🛒</Text>
          {cartCount > 0 && (
            <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{cartCount}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      {!committed ? (
        <View style={styles.suggestions}>
          <Text style={styles.suggestTitle}>Popular searches</Text>
          <View style={styles.suggestChips}>
            {SUGGESTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={styles.suggestChip}
                onPress={() => { setQuery(s); submit(s); }}
              >
                <Text style={styles.suggestChipText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : products.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 36, marginBottom: 12 }}>🔍</Text>
          <Text style={styles.emptyTitle}>No results for "{committed}"</Text>
          <Text style={styles.emptySub}>Try a different keyword or browse categories.</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => router.back()}>
            <Text style={styles.browseBtnText}>Browse categories</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={styles.resultCount}>{data?.pagination.total} results for "{committed}"</Text>
          <FlatList
            data={products}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => <SearchProductCard item={item} />}
            contentContainerStyle={styles.list}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 8 },
  backBtn: { padding: 4 },
  backIcon: { fontSize: 20, color: Colors.text },
  input: { flex: 1, height: 40, backgroundColor: Colors.surfaceAlt, borderRadius: 10, paddingHorizontal: 12, fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  clearBtn: { padding: 4 },
  clearText: { fontSize: 14, color: Colors.textMuted },
  cartBtn: { position: 'relative', padding: 4 },
  cartIcon: { fontSize: 22 },
  cartBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: Colors.primary, borderRadius: 8, minWidth: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  cartBadgeText: { fontSize: 9, fontWeight: '700', color: '#fff' },
  suggestions: { paddingHorizontal: 20, paddingTop: 24 },
  suggestTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 14 },
  suggestChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  suggestChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt },
  suggestChipText: { fontSize: 13, color: Colors.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptySub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  browseBtn: { borderWidth: 1, borderColor: Colors.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  browseBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
  resultCount: { fontSize: 12, color: Colors.textSecondary, paddingHorizontal: 16, paddingVertical: 10 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  resultCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  resultThumb: { width: 64, height: 64, borderRadius: 10 },
  resultThumbPlaceholder: { width: 64, height: 64, borderRadius: 10, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  resultBody: { flex: 1 },
  resultSupplier: { fontSize: 10, color: Colors.textMuted, marginBottom: 2 },
  resultName: { fontSize: 13, fontWeight: '600', color: Colors.text, lineHeight: 18 },
  resultPrice: { fontSize: 13, fontWeight: '700', color: Colors.primary, marginTop: 4 },
  resultAddBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  resultAddBtnActive: { backgroundColor: Colors.primary },
  resultAddBtnText: { fontSize: 16, color: Colors.primary, fontWeight: '700', lineHeight: 20 },
});
