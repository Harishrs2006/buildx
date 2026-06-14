import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCartStore, type CartItem } from '../../src/store/cart.store';
import { Colors } from '../../src/constants/colors';

function CartRow({ item }: { item: CartItem }) {
  const updateQty = useCartStore((s) => s.updateQty);
  const removeItem = useCartStore((s) => s.removeItem);

  return (
    <View style={styles.row}>
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={styles.thumbPlaceholder}><Text style={{ fontSize: 20 }}>🏗️</Text></View>
      )}
      <View style={styles.rowBody}>
        <Text style={styles.rowSupplier} numberOfLines={1}>{item.supplierName}</Text>
        <Text style={styles.rowName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.rowPrice}>₹{item.basePrice.toLocaleString('en-IN')} / {item.unit}</Text>
        <View style={styles.qtyRow}>
          <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.productId, item.quantity - 1)}>
            <Text style={styles.qtyBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.qtyVal}>{item.quantity}</Text>
          <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.productId, item.quantity + 1)}>
            <Text style={styles.qtyBtnText}>+</Text>
          </TouchableOpacity>
          <Text style={styles.rowLineTotal}>
            = ₹{(item.basePrice * item.quantity).toLocaleString('en-IN')}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.removeBtn}
        onPress={() =>
          Alert.alert('Remove item', `Remove ${item.name} from cart?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: () => removeItem(item.productId) },
          ])
        }
      >
        <Text style={styles.removeText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function CartScreen() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const gstTotal = useCartStore((s) => s.gstTotal());
  const grandTotal = useCartStore((s) => s.grandTotal());
  const itemCount = useCartStore((s) => s.itemCount());
  const clear = useCartStore((s) => s.clear);

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cart</Text>
        </View>
        <View style={styles.empty}>
          <Text style={{ fontSize: 52, marginBottom: 16 }}>🛒</Text>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySub}>Browse materials and add them here.</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => router.back()}>
            <Text style={styles.browseBtnText}>Browse products</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cart ({itemCount})</Text>
        <TouchableOpacity
          onPress={() =>
            Alert.alert('Clear cart', 'Remove all items?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Clear', style: 'destructive', onPress: clear },
            ])
          }
        >
          <Text style={styles.clearAll}>Clear all</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.productId}
        renderItem={({ item }) => <CartRow item={item} />}
        contentContainerStyle={styles.list}
        ListFooterComponent={
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Order Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>₹{subtotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>GST</Text>
              <Text style={styles.summaryValue}>₹{gstTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery</Text>
              <Text style={[styles.summaryValue, { color: Colors.success }]}>FREE</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.summaryTotalLabel}>Total</Text>
              <Text style={styles.summaryTotalValue}>₹{grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
            </View>
          </View>
        }
      />

      <View style={styles.stickyBar}>
        <View>
          <Text style={styles.stickyLabel}>Total incl. GST</Text>
          <Text style={styles.stickyTotal}>₹{grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
        </View>
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={() => router.push('/(buyer)/checkout' as never)}
          activeOpacity={0.85}
        >
          <Text style={styles.checkoutText}>Proceed to Checkout →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { padding: 4, marginRight: 8 },
  backIcon: { fontSize: 20, color: Colors.text },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: Colors.text },
  clearAll: { fontSize: 13, color: Colors.error, fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  row: { flexDirection: 'row', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 12 },
  thumb: { width: 72, height: 72, borderRadius: 10 },
  thumbPlaceholder: { width: 72, height: 72, borderRadius: 10, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1 },
  rowSupplier: { fontSize: 10, color: Colors.textMuted, marginBottom: 2 },
  rowName: { fontSize: 13, fontWeight: '600', color: Colors.text, lineHeight: 18 },
  rowPrice: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 16, color: Colors.primary, fontWeight: '700', lineHeight: 20 },
  qtyVal: { fontSize: 15, fontWeight: '700', color: Colors.text, minWidth: 20, textAlign: 'center' },
  rowLineTotal: { marginLeft: 'auto', fontSize: 13, fontWeight: '700', color: Colors.text },
  removeBtn: { padding: 4 },
  removeText: { fontSize: 14, color: Colors.textMuted },
  summary: { marginTop: 20, padding: 16, backgroundColor: Colors.surfaceAlt, borderRadius: 14, borderWidth: 1, borderColor: Colors.border },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { fontSize: 14, color: Colors.textSecondary },
  summaryValue: { fontSize: 14, fontWeight: '600', color: Colors.text },
  summaryTotal: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12, marginBottom: 0, marginTop: 4 },
  summaryTotalLabel: { fontSize: 15, fontWeight: '700', color: Colors.text },
  summaryTotalValue: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: 24 },
  browseBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  browseBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  stickyBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface, gap: 16 },
  stickyLabel: { fontSize: 11, color: Colors.textMuted },
  stickyTotal: { fontSize: 18, fontWeight: '800', color: Colors.text },
  checkoutBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  checkoutText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
