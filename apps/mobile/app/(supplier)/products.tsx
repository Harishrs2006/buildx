import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { router } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { useSupplierProducts, useUpdateProduct, type SupplierProduct } from '../../src/hooks/useSupplier';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  ACTIVE:       { bg: '#D1FAE5', text: '#065F46' },
  DRAFT:        { bg: '#DBEAFE', text: '#1E40AF' },
  INACTIVE:     { bg: '#F3F4F6', text: '#6B7280' },
  OUT_OF_STOCK: { bg: '#FEE2E2', text: '#991B1B' },
  DISCONTINUED: { bg: '#F3F4F6', text: '#6B7280' },
};

function ProductCard({ product, onToggle }: { product: SupplierProduct; onToggle: (id: string, status: string) => void }) {
  const sc = STATUS_COLORS[product.status] ?? STATUS_COLORS.INACTIVE;
  const primaryImage = product.images?.find((i) => i.isPrimary)?.url ?? product.images?.[0]?.url;

  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={styles.imagePlaceholder}>
          {primaryImage ? null : <Text style={styles.imagePlaceholderText}>📦</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
          <Text style={styles.productCategory}>{(product.categoryId as any)?.name ?? ''}</Text>
          <Text style={styles.productPrice}>₹{product.basePrice.toLocaleString('en-IN')} / {product.unit}</Text>
          <Text style={styles.productStock}>Stock: {product.stockQuantity} {product.unit}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: sc.bg }]}>
          <Text style={[styles.badgeText, { color: sc.text }]}>{product.status}</Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <Text style={styles.soldText}>{product.totalSold} sold</Text>
        <View style={styles.btnRow}>
          {product.status === 'ACTIVE' ? (
            <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => onToggle(product._id, 'INACTIVE')}>
              <Text style={[styles.btnText, { color: Colors.textSecondary }]}>Deactivate</Text>
            </TouchableOpacity>
          ) : product.status !== 'DISCONTINUED' ? (
            <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => onToggle(product._id, 'ACTIVE')}>
              <Text style={[styles.btnText, { color: Colors.primary }]}>Activate</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={[styles.btn, { backgroundColor: Colors.primary }]} onPress={() => router.push({ pathname: '/(supplier)/product/edit', params: { id: product._id } })}>
            <Text style={[styles.btnText, { color: '#fff' }]}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function SupplierProductsScreen() {
  const [filter, setFilter] = useState('');
  const { data, isLoading, refetch, isRefetching } = useSupplierProducts(filter || undefined);
  const { mutate: updateProduct } = useUpdateProduct();

  const products = data?.data ?? [];

  function handleToggle(id: string, status: string) {
    updateProduct({ id, data: { status } }, {
      onError: () => Alert.alert('Error', 'Failed to update product.'),
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>My Products</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(supplier)/product/add')}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterRow}>
          {[['', 'All'], ['ACTIVE', 'Active'], ['DRAFT', 'Draft'], ['OUT_OF_STOCK', 'Out of Stock']].map(([key, label]) => (
            <TouchableOpacity key={key} style={[styles.filterChip, filter === key && styles.filterChipActive]} onPress={() => setFilter(key)}>
              <Text style={[styles.filterText, filter === key && styles.filterTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 48 }} />
        ) : (
          <FlatList
            data={products}
            keyExtractor={(p) => p._id}
            renderItem={({ item }) => <ProductCard product={item} onToggle={handleToggle} />}
            contentContainerStyle={{ paddingBottom: 32 }}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📦</Text>
                <Text style={styles.empty}>No products yet{'\n'}Tap + Add to list your first material</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text },
  addBtn: { backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  filterTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  imagePlaceholder: { width: 60, height: 60, borderRadius: 10, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  imagePlaceholderText: { fontSize: 24 },
  productName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  productCategory: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  productPrice: { fontSize: 14, fontWeight: '600', color: Colors.primary, marginTop: 4 },
  productStock: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10 },
  soldText: { fontSize: 12, color: Colors.textMuted },
  btnRow: { flexDirection: 'row', gap: 8 },
  btn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  btnOutline: { borderWidth: 1, borderColor: Colors.border },
  btnText: { fontSize: 12, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  empty: { textAlign: 'center', color: Colors.textSecondary, lineHeight: 24, fontSize: 15 },
});
