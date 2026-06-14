import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useCartStore } from '../../src/store/cart.store';
import { useAuthStore } from '../../src/store/auth.store';
import { useCreateOrder, cartItemsToOrderPayload } from '../../src/hooks/useOrders';
import { Colors } from '../../src/constants/colors';

type DeliveryAddress = {
  label: string;
  fullAddress: string;
  lat: number;
  lng: number;
  contactPhone: string;
};

export default function CheckoutScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const gstTotal = useCartStore((s) => s.gstTotal());
  const grandTotal = useCartStore((s) => s.grandTotal());
  const clearCart = useCartStore((s) => s.clear);

  const { mutateAsync: createOrder, isPending } = useCreateOrder();

  const [address, setAddress] = useState<DeliveryAddress>({
    label: 'Site',
    fullAddress: '',
    lat: 13.3400,
    lng: 77.1006,
    contactPhone: user?.phone ?? '',
  });
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState<'address' | 'summary'>('address');

  const supplierName = items[0]?.supplierName ?? 'Supplier';

  async function handlePlaceOrder() {
    try {
      const res = await createOrder({
        items: cartItemsToOrderPayload(items),
        deliveryAddress: address,
        notes: notes.trim() || undefined,
      });

      clearCart();
      router.replace({
        pathname: '/(buyer)/order-success',
        params: { orderNumber: res.data.orderNumber },
      } as never);
    } catch (err: any) {
      Alert.alert('Order failed', err?.message ?? 'Something went wrong. Please try again.');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => (step === 'summary' ? setStep('address') : router.back())}
            style={styles.backBtn}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {step === 'address' ? 'Delivery Address' : 'Order Summary'}
          </Text>
          <View style={styles.steps}>
            <View style={[styles.stepDot, styles.stepDotActive]} />
            <View style={[styles.stepLine, step === 'summary' && styles.stepLineActive]} />
            <View style={[styles.stepDot, step === 'summary' && styles.stepDotActive]} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {step === 'address' ? (
            <AddressForm
              address={address}
              onChange={setAddress}
              notes={notes}
              onNotesChange={setNotes}
            />
          ) : (
            <OrderSummaryView
              items={items}
              supplierName={supplierName}
              address={address}
              subtotal={subtotal}
              gstTotal={gstTotal}
              grandTotal={grandTotal}
              notes={notes}
            />
          )}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Sticky bottom bar */}
        <View style={styles.stickyBar}>
          <View>
            <Text style={styles.totalLabel}>Total payable</Text>
            <Text style={styles.totalValue}>
              ₹{grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
          </View>

          {step === 'address' ? (
            <TouchableOpacity
              style={[styles.btn, !address.fullAddress.trim() && styles.btnDisabled]}
              onPress={() => {
                if (!address.fullAddress.trim()) {
                  Alert.alert('Required', 'Enter your delivery address before continuing');
                  return;
                }
                setStep('summary');
              }}
              disabled={!address.fullAddress.trim()}
            >
              <Text style={styles.btnText}>Review Order →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.btn, isPending && styles.btnDisabled]}
              onPress={handlePlaceOrder}
              disabled={isPending}
            >
              {isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Place Order (COD) →</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Address form ─────────────────────────────────────────────────────────────

function AddressForm({ address, onChange, notes, onNotesChange }: {
  address: DeliveryAddress;
  onChange: (a: DeliveryAddress) => void;
  notes: string;
  onNotesChange: (n: string) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Where should we deliver?</Text>

      <Text style={styles.label}>Address label</Text>
      <View style={styles.labelChips}>
        {['Site', 'Home', 'Office', 'Other'].map((lbl) => (
          <TouchableOpacity
            key={lbl}
            style={[styles.chip, address.label === lbl && styles.chipActive]}
            onPress={() => onChange({ ...address, label: lbl })}
          >
            <Text style={[styles.chipText, address.label === lbl && styles.chipTextActive]}>
              {lbl}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Full address *</Text>
      <TextInput
        style={[styles.input, styles.inputMulti]}
        value={address.fullAddress}
        onChangeText={(v) => onChange({ ...address, fullAddress: v })}
        placeholder="Door/plot number, street, area, city, PIN..."
        placeholderTextColor={Colors.textMuted}
        multiline
        numberOfLines={3}
      />

      <Text style={styles.label}>Contact number at delivery site</Text>
      <TextInput
        style={styles.input}
        value={address.contactPhone}
        onChangeText={(v) => onChange({ ...address, contactPhone: v })}
        placeholder="10-digit mobile number"
        placeholderTextColor={Colors.textMuted}
        keyboardType="phone-pad"
        maxLength={10}
      />

      <Text style={styles.label}>Delivery notes (optional)</Text>
      <TextInput
        style={[styles.input, styles.inputMulti]}
        value={notes}
        onChangeText={onNotesChange}
        placeholder="E.g. call before delivery, gate code, landmark..."
        placeholderTextColor={Colors.textMuted}
        multiline
        numberOfLines={2}
      />
    </View>
  );
}

// ─── Order summary ────────────────────────────────────────────────────────────

function OrderSummaryView({ items, supplierName, address, subtotal, gstTotal, grandTotal, notes }: any) {
  return (
    <View>
      {/* Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Items from {supplierName}</Text>
        {items.map((item: any) => (
          <View key={item.productId} style={styles.orderItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.itemMeta}>
                {item.quantity} {item.unit} × ₹{item.basePrice.toLocaleString('en-IN')}
              </Text>
            </View>
            <Text style={styles.itemTotal}>
              ₹{(item.basePrice * item.quantity).toLocaleString('en-IN')}
            </Text>
          </View>
        ))}
      </View>

      {/* Delivery address */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivering to</Text>
        <View style={styles.addressCard}>
          <Text style={styles.addressLabel}>{address.label}</Text>
          <Text style={styles.addressFull}>{address.fullAddress}</Text>
          {address.contactPhone ? (
            <Text style={styles.addressMeta}>📞 {address.contactPhone}</Text>
          ) : null}
          {notes ? <Text style={styles.addressMeta}>📝 {notes}</Text> : null}
        </View>
      </View>

      {/* Price breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Price Breakdown</Text>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Subtotal</Text>
          <Text style={styles.priceValue}>
            ₹{subtotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>GST</Text>
          <Text style={styles.priceValue}>
            ₹{gstTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Delivery</Text>
          <Text style={[styles.priceValue, { color: Colors.success }]}>FREE</Text>
        </View>
        <View style={[styles.priceRow, styles.priceRowTotal]}>
          <Text style={styles.priceTotalLabel}>Total</Text>
          <Text style={styles.priceTotalValue}>
            ₹{grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </Text>
        </View>
      </View>

      {/* COD note */}
      <View style={styles.codNote}>
        <Text style={styles.codIcon}>💵</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.codTitle}>Cash on Delivery</Text>
          <Text style={styles.codSub}>
            Pay ₹{grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })} in cash when
            your materials arrive at the site.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4, marginRight: 10 },
  backIcon: { fontSize: 20, color: Colors.text },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: Colors.text },
  steps: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  stepDotActive: { backgroundColor: Colors.primary },
  stepLine: { width: 20, height: 2, backgroundColor: Colors.border },
  stepLineActive: { backgroundColor: Colors.primary },
  scroll: { paddingHorizontal: 20, paddingTop: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8, marginTop: 12 },
  labelChips: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: Colors.text, backgroundColor: Colors.surfaceAlt,
  },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  orderItem: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 8,
  },
  itemName: { fontSize: 14, fontWeight: '600', color: Colors.text, lineHeight: 18 },
  itemMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 3 },
  itemTotal: { fontSize: 14, fontWeight: '700', color: Colors.text, minWidth: 70, textAlign: 'right' },
  addressCard: {
    padding: 14, backgroundColor: Colors.surfaceAlt,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
  },
  addressLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.primary,
    textTransform: 'uppercase', marginBottom: 4,
  },
  addressFull: { fontSize: 14, color: Colors.text, lineHeight: 20 },
  addressMeta: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  priceLabel: { fontSize: 14, color: Colors.textSecondary },
  priceValue: { fontSize: 14, fontWeight: '600', color: Colors.text },
  priceRowTotal: {
    borderTopWidth: 1, borderTopColor: Colors.border,
    paddingTop: 12, marginTop: 4, marginBottom: 0,
  },
  priceTotalLabel: { fontSize: 15, fontWeight: '700', color: Colors.text },
  priceTotalValue: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  codNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    padding: 16, backgroundColor: Colors.warningLight,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.warning,
    marginBottom: 8,
  },
  codIcon: { fontSize: 28 },
  codTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  codSub: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  stickyBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
    paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.surface, gap: 16,
  },
  totalLabel: { fontSize: 11, color: Colors.textMuted },
  totalValue: { fontSize: 18, fontWeight: '800', color: Colors.text },
  btn: {
    flex: 1, backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
