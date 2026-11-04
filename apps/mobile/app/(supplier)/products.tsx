import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useState } from 'react';
import { router } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { Font } from '../../src/constants/typography';
import { useSupplierProducts, useUpdateProduct, type SupplierProduct } from '../../src/hooks/useSupplier';
import { Button, EmptyState, Icon, Notice, Pill, type } from '../../src/components/ui';

const STATUS: Record<string, { label: string; bg: string; text: string }> = {
  ACTIVE: { label: 'Live', bg: Colors.successLight, text: Colors.success },
  DRAFT: { label: 'Draft', bg: Colors.cobaltSoft, text: Colors.cobalt },
  INACTIVE: { label: 'Paused', bg: Colors.sand3, text: Colors.stone },
  OUT_OF_STOCK: { label: 'Out of stock', bg: Colors.errorLight, text: Colors.error },
  DISCONTINUED: { label: 'Discontinued', bg: Colors.sand3, text: Colors.stone },
};

const FILTERS: [string, string][] = [['', 'All'], ['ACTIVE', 'Live'], ['DRAFT', 'Drafts'], ['OUT_OF_STOCK', 'Out of stock']];

function ProductCard({ product, onToggle, busy }: { product: SupplierProduct; onToggle: (id: string, status: SupplierProduct['status']) => void; busy: boolean }) {
  const st = STATUS[product.status] ?? STATUS.INACTIVE;
  const image = product.images?.find((i) => i.isPrimary)?.url ?? product.images?.[0]?.url;

  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        {image ? (
          <Image source={{ uri: image }} style={styles.thumb} contentFit="cover" transition={150} />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty]}><Icon name="image-off-outline" size={24} color={Colors.stone} /></View>
        )}
        <View style={styles.flex}>
          <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
          <Text style={styles.category}>{(product.categoryId as any)?.name ?? ''}</Text>
          <Text style={styles.price}>₹{product.basePrice.toLocaleString('en-IN')} <Text style={styles.unit}>/ {product.unit}</Text></Text>
        </View>
        <Pill label={st.label} bg={st.bg} color={st.text} />
      </View>

      <View style={styles.facts}>
        <View style={styles.fact}>
          <Text style={styles.factValue}>{product.stockQuantity}</Text>
          <Text style={styles.factLabel}>{product.unit} in stock</Text>
        </View>
        <View style={styles.fact}>
          <Text style={styles.factValue}>{product.totalSold}</Text>
          <Text style={styles.factLabel}>sold</Text>
        </View>
      </View>

      <View style={styles.actions}>
        {product.status === 'ACTIVE' ? (
          <Pressable style={styles.action} onPress={() => onToggle(product._id, 'INACTIVE')} disabled={busy} accessibilityRole="button">
            <Icon name="pause" size={18} />
            <Text style={styles.actionText}>Pause</Text>
          </Pressable>
        ) : product.status !== 'DISCONTINUED' ? (
          <Pressable style={styles.action} onPress={() => onToggle(product._id, 'ACTIVE')} disabled={busy} accessibilityRole="button">
            <Icon name="play" size={18} />
            <Text style={styles.actionText}>{product.status === 'DRAFT' ? 'Publish' : 'Make live'}</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={[styles.action, styles.actionPrimary]}
          onPress={() => router.push({ pathname: '/(supplier)/product/edit', params: { id: product._id } })}
          accessibilityRole="button"
        >
          <Icon name="pencil-outline" size={18} />
          <Text style={styles.actionText}>Edit</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function SupplierProductsScreen() {
  const [filter, setFilter] = useState('');
  const { data, isLoading, isError, refetch, isRefetching } = useSupplierProducts(filter || undefined);
  const { mutate: updateProduct, isPending, variables } = useUpdateProduct();
  const [error, setError] = useState<string | null>(null);

  const products = data?.data ?? [];

  function handleToggle(id: string, status: SupplierProduct['status']) {
    setError(null);
    updateProduct({ id, data: { status } }, {
      onError: (err) => setError(err.message || 'We could not update that product. Please try again.'),
    });
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.header}>
        <Text style={type.title}>Products</Text>
        <Button title="List a product" variant="lime" onPress={() => router.push('/(supplier)/product/add')} style={styles.addBtn} />
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map(([key, label]) => {
            const on = filter === key;
            return (
              <Pressable key={key} style={[styles.chip, on && styles.chipOn]} onPress={() => setFilter(key)} accessibilityRole="tab" accessibilityState={{ selected: on }}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {error ? <Notice tone="error" onClose={() => setError(null)} style={styles.notice}>{error}</Notice> : null}

      {isLoading ? (
        <ActivityIndicator color={Colors.ink} style={styles.loading} />
      ) : isError ? (
        <Notice tone="error" title="We could not load your products" style={styles.notice}>
          <Pressable onPress={() => refetch()} hitSlop={8} accessibilityRole="button"><Text style={styles.link}>Try again</Text></Pressable>
        </Notice>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => p._id}
          renderItem={({ item }) => (
            <ProductCard product={item} onToggle={handleToggle} busy={isPending && (variables as any)?.id === item._id} />
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.ink} />}
          ListEmptyComponent={
            <EmptyState
              icon="package-variant"
              title={filter ? 'Nothing here' : 'No products yet'}
              body={filter ? 'No products with this status.' : 'List your first product so buyers can order it.'}
              action={filter ? undefined : <Button title="List a product" onPress={() => router.push('/(supplier)/product/add')} />}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.sand },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  addBtn: { minHeight: 44, paddingHorizontal: 18 },
  filters: { paddingHorizontal: 20, gap: 8, paddingBottom: 12 },
  chip: { height: 38, paddingHorizontal: 16, borderRadius: 19, borderWidth: 1, borderColor: Colors.sand4, backgroundColor: Colors.sand2, justifyContent: 'center' },
  chipOn: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  chipText: { fontFamily: Font.semiBold, fontSize: 14, color: Colors.ink },
  chipTextOn: { color: Colors.sand },
  notice: { marginHorizontal: 20, marginBottom: 10 },
  link: { fontFamily: Font.bold, fontSize: 14, color: Colors.ink, textDecorationLine: 'underline', marginTop: 4 },
  loading: { marginTop: 48 },
  list: { paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  card: { padding: 14, borderRadius: 20, backgroundColor: Colors.sand2, borderWidth: 1, borderColor: Colors.sand4 },
  cardRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  thumb: { width: 68, height: 68, borderRadius: 12, backgroundColor: Colors.sand3 },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: Font.semiBold, fontSize: 15, lineHeight: 20, color: Colors.ink },
  category: { fontFamily: Font.mono, fontSize: 10, letterSpacing: 0.5, color: Colors.stone, textTransform: 'uppercase', marginTop: 2 },
  price: { fontFamily: Font.bold, fontSize: 16, color: Colors.ink, marginTop: 4 },
  unit: { fontFamily: Font.regular, fontSize: 13, color: Colors.stone },
  facts: { flexDirection: 'row', gap: 8, marginTop: 12 },
  fact: { flex: 1, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: Colors.sand },
  factValue: { fontFamily: Font.display, fontSize: 18, color: Colors.ink },
  factLabel: { fontFamily: Font.regular, fontSize: 12, color: Colors.stone },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  action: { flex: 1, flexDirection: 'row', gap: 6, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(11,12,10,0.18)' },
  actionPrimary: { backgroundColor: Colors.lime, borderColor: Colors.lime },
  actionText: { fontFamily: Font.bold, fontSize: 14, color: Colors.ink },
});
