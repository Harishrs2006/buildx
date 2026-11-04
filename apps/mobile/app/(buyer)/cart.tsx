import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCartStore, type CartItem } from '../../src/store/cart.store';
import { Colors } from '../../src/constants/colors';
import { Font } from '../../src/constants/typography';
import { Button, ConfirmSheet, EmptyState, Eyebrow, Icon, Notice, ScreenHeader } from '../../src/components/ui';

const rupees = (n: number, digits = 0) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: digits })}`;

function CartRow({ item, onRemove }: { item: CartItem; onRemove: (item: CartItem) => void }) {
  const updateQty = useCartStore((s) => s.updateQty);
  const lineTotal = useCartStore((s) => s.lineTotal(item.productId));

  return (
    <View style={styles.row}>
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.thumb} contentFit="cover" transition={150} />
      ) : (
        <View style={[styles.thumb, styles.thumbEmpty]}><Icon name="package-variant-closed" size={26} color={Colors.stone} /></View>
      )}
      <View style={styles.rowBody}>
        <Text style={styles.rowSupplier} numberOfLines={1}>{item.supplierName}</Text>
        <Text style={styles.rowName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.rowPrice}>{rupees(item.basePrice)} / {item.unit}</Text>
        <View style={styles.qtyRow}>
          <View style={styles.stepper}>
            <Pressable
              style={styles.stepBtn}
              onPress={() => (item.quantity <= 1 ? onRemove(item) : updateQty(item.productId, item.quantity - 1))}
              accessibilityRole="button"
              accessibilityLabel={`One less ${item.name}`}
              hitSlop={6}
            >
              <Icon name="minus" size={18} />
            </Pressable>
            <Text style={styles.qtyVal} accessibilityLabel={`Quantity ${item.quantity}`}>{item.quantity}</Text>
            <Pressable
              style={styles.stepBtn}
              onPress={() => updateQty(item.productId, item.quantity + 1)}
              accessibilityRole="button"
              accessibilityLabel={`One more ${item.name}`}
              hitSlop={6}
            >
              <Icon name="plus" size={18} />
            </Pressable>
          </View>
          <Text style={styles.rowLineTotal}>{rupees(lineTotal, 2)}</Text>
        </View>
      </View>
      <Pressable onPress={() => onRemove(item)} style={styles.removeBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove ${item.name}`}>
        <Icon name="trash-can-outline" size={20} color={Colors.stone} />
      </Pressable>
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
  const removeItem = useCartStore((s) => s.removeItem);
  const clear = useCartStore((s) => s.clear);

  const [removing, setRemoving] = useState<CartItem | null>(null);
  const [clearing, setClearing] = useState(false);
  // One order comes from one supplier (the API refuses mixed carts); the AI assistant can mix them
  const supplierCount = new Set(items.map((i) => i.supplierId)).size;

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Cart" onBack={() => router.back()} />
        <EmptyState
          icon="cart-outline"
          title="Your cart is empty"
          body="Browse materials and add what the site needs."
          action={<Button title="Browse materials" onPress={() => router.replace('/(buyer)/home')} />}
          style={styles.emptyBox}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        eyebrow={`${itemCount} item${itemCount === 1 ? '' : 's'}`}
        title="Cart"
        onBack={() => router.back()}
        right={
          <Pressable onPress={() => setClearing(true)} hitSlop={8} accessibilityRole="button">
            <Text style={styles.clearAll}>Clear all</Text>
          </Pressable>
        }
      />

      <FlatList
        data={items}
        keyExtractor={(item) => item.productId}
        renderItem={({ item }) => <CartRow item={item} onRemove={setRemoving} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          supplierCount > 1 ? (
            <Notice tone="warning" title={`Items from ${supplierCount} suppliers`} style={styles.mixed}>
              One order comes from one supplier. Remove items until only one supplier is left, then check out.
            </Notice>
          ) : null
        }
        ListFooterComponent={
          <View style={styles.summary}>
            <Eyebrow>Summary</Eyebrow>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{rupees(subtotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>GST</Text>
              <Text style={styles.summaryValue}>{rupees(gstTotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery</Text>
              <Text style={styles.summaryMuted}>Calculated at checkout</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.summaryTotalLabel}>Estimated total</Text>
              <Text style={styles.summaryTotalValue}>{rupees(grandTotal)}</Text>
            </View>
          </View>
        }
      />

      <SafeAreaView edges={['bottom']} style={styles.stickyBar}>
        <View>
          <Text style={styles.stickyLabel}>Incl. GST</Text>
          <Text style={styles.stickyTotal}>{rupees(grandTotal)}</Text>
        </View>
        <Button title="Checkout" variant="lime" onPress={() => router.push('/(buyer)/checkout' as never)} disabled={supplierCount > 1} style={styles.checkoutBtn} />
      </SafeAreaView>

      <ConfirmSheet
        visible={!!removing}
        title="Remove this item?"
        body={removing ? `${removing.name} will be taken out of your cart.` : undefined}
        confirmLabel="Remove"
        danger
        onConfirm={() => {
          if (removing) removeItem(removing.productId);
          setRemoving(null);
        }}
        onCancel={() => setRemoving(null)}
      />
      <ConfirmSheet
        visible={clearing}
        title="Clear your cart?"
        body="Every item will be removed. This cannot be undone."
        confirmLabel="Clear cart"
        danger
        onConfirm={() => {
          clear();
          setClearing(false);
        }}
        onCancel={() => setClearing(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.sand },
  emptyBox: { flex: 1, justifyContent: 'center' },
  clearAll: { fontFamily: Font.semiBold, fontSize: 14, color: Colors.error },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  mixed: { marginBottom: 10 },
  row: { flexDirection: 'row', gap: 12, padding: 12, marginBottom: 10, borderRadius: 18, backgroundColor: Colors.sand2, borderWidth: 1, borderColor: Colors.sand4 },
  thumb: { width: 76, height: 76, borderRadius: 12, backgroundColor: Colors.sand3 },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1 },
  rowSupplier: { fontFamily: Font.mono, fontSize: 11, letterSpacing: 0.5, color: Colors.stone, textTransform: 'uppercase' },
  rowName: { fontFamily: Font.semiBold, fontSize: 15, lineHeight: 20, color: Colors.ink, marginTop: 2 },
  rowPrice: { fontFamily: Font.regular, fontSize: 13, color: Colors.stone, marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1, borderColor: Colors.sand4, backgroundColor: Colors.sand },
  stepBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  qtyVal: { fontFamily: Font.bold, fontSize: 15, color: Colors.ink, minWidth: 28, textAlign: 'center' },
  rowLineTotal: { fontFamily: Font.bold, fontSize: 15, color: Colors.ink },
  removeBtn: { padding: 4, alignSelf: 'flex-start' },
  summary: { marginTop: 10, padding: 18, backgroundColor: Colors.sand2, borderRadius: 18, borderWidth: 1, borderColor: Colors.sand4, gap: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontFamily: Font.regular, fontSize: 15, color: Colors.stone },
  summaryValue: { fontFamily: Font.semiBold, fontSize: 15, color: Colors.ink },
  summaryMuted: { fontFamily: Font.regular, fontSize: 14, color: Colors.stone },
  summaryTotal: { borderTopWidth: 1, borderTopColor: Colors.sand4, paddingTop: 12, marginTop: 2 },
  summaryTotalLabel: { fontFamily: Font.bold, fontSize: 16, color: Colors.ink },
  summaryTotalValue: { fontFamily: Font.display, fontSize: 22, color: Colors.ink },
  stickyBar: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, backgroundColor: Colors.ink, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  stickyLabel: { fontFamily: Font.mono, fontSize: 11, letterSpacing: 1, color: 'rgba(242,239,231,0.6)', textTransform: 'uppercase' },
  stickyTotal: { fontFamily: Font.display, fontSize: 22, color: Colors.sand },
  checkoutBtn: { flex: 1 },
});
