import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useCartStore } from '../../src/store/cart.store';
import { useAuthStore } from '../../src/store/auth.store';
import { useCreateOrder, useOrderQuote, cartItemsToOrderPayload, newIdempotencyKey, type OrderQuote } from '../../src/hooks/useOrders';
import { Colors } from '../../src/constants/colors';
import { Font } from '../../src/constants/typography';
import { buildDeliveryAddress, type DeliveryAddressForm } from '../../src/lib/deliveryAddress';
import { Button, Eyebrow, Icon, Notice, ScreenHeader } from '../../src/components/ui';

// What the buyer types. Coordinates are not part of the form: the app has no location
// provider, so none are ever sent (see src/lib/deliveryAddress.ts).
type DeliveryAddress = DeliveryAddressForm;

const rupees = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function CheckoutScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const items = useCartStore((s) => s.items);
  const estimatedTotal = useCartStore((s) => s.grandTotal());
  const clearCart = useCartStore((s) => s.clear);

  const { mutateAsync: createOrder, isPending } = useCreateOrder();
  // One key per checkout attempt: retries/double-taps reuse it, so the server creates one order
  const [idempotencyKey] = useState(newIdempotencyKey);

  const [address, setAddress] = useState<DeliveryAddress>({
    label: 'Site',
    fullAddress: '',
    // Google sign-in accounts have no phone: the buyer types one (the driver calls it)
    contactPhone: user?.phone ? user.phone.slice(-10) : '',
  });
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState<'address' | 'summary'>('address');
  const [triedNext, setTriedNext] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const addressOk = !!address.fullAddress.trim();
  const pinOk = /^[1-9]\d{5}$/.test(address.pincode ?? '');
  const phoneOk = /^[6-9]\d{9}$/.test(address.contactPhone.trim());

  // Prices shown on the summary come from the server (GST-inclusive/exclusive, bulk tiers, delivery)
  const orderItems = cartItemsToOrderPayload(items);
  const quoteQuery = useOrderQuote(orderItems, step === 'summary', pinOk ? address.pincode : undefined);
  const quote = quoteQuery.data?.data;
  const grandTotal = step === 'summary' && quote ? quote.total : estimatedTotal;

  const supplierName = items[0]?.supplierName ?? 'Supplier';

  function goToSummary() {
    setTriedNext(true);
    if (!addressOk || !phoneOk || !pinOk) return;
    setOrderError(null);
    setStep('summary');
  }

  async function handlePlaceOrder() {
    if (!quote) return;
    setOrderError(null);
    try {
      const res = await createOrder({
        items: orderItems,
        // No device location is available in the app → no coordinates, never a default
        deliveryAddress: buildDeliveryAddress(address, null),
        notes: notes.trim() || undefined,
        expectedTotal: quote.total,
        idempotencyKey,
      });

      clearCart();
      router.replace({
        pathname: '/(buyer)/order-success',
        params: { orderNumber: res.data.orderNumber },
      } as never);
    } catch (err: any) {
      setOrderError(err?.message ?? 'Something went wrong. Please try again.');
      quoteQuery.refetch(); // stock or prices may have changed
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScreenHeader
          eyebrow={step === 'address' ? 'Step 1 of 2' : 'Step 2 of 2'}
          title={step === 'address' ? 'Delivery address' : 'Review and place'}
          onBack={() => (step === 'summary' ? setStep('address') : router.back())}
        />
        <View style={styles.progress}>
          <View style={[styles.progressBar, styles.progressOn]} />
          <View style={[styles.progressBar, step === 'summary' && styles.progressOn]} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {step === 'address' ? (
            <AddressForm
              address={address}
              onChange={setAddress}
              notes={notes}
              onNotesChange={setNotes}
              addressError={triedNext && !addressOk}
              phoneError={triedNext && !phoneOk}
              pinError={triedNext && !pinOk}
            />
          ) : quote ? (
            <OrderSummaryView quote={quote} supplierName={supplierName} address={address} notes={notes} />
          ) : quoteQuery.isError ? (
            <Notice tone="error" title="We could not price your order">
              <Text style={styles.noticeText}>{quoteQuery.error.message}</Text>
              <Pressable onPress={() => quoteQuery.refetch()} hitSlop={8} accessibilityRole="button">
                <Text style={styles.noticeLink}>Try again</Text>
              </Pressable>
            </Notice>
          ) : (
            <View style={styles.loading}>
              <ActivityIndicator color={Colors.ink} />
              <Text style={styles.loadingText}>Getting today's prices from the supplier…</Text>
            </View>
          )}
          {orderError ? <Notice tone="error" title="Order not placed" style={styles.orderError}>{orderError}</Notice> : null}
          <View style={styles.spacer} />
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.stickyBar}>
          <View>
            <Text style={styles.totalLabel}>{step === 'summary' && quote ? 'Pay on delivery' : 'Estimated'}</Text>
            <Text style={styles.totalValue}>{rupees(grandTotal)}</Text>
          </View>
          {step === 'address' ? (
            <Button title="Review order" variant="lime" onPress={goToSummary} style={styles.cta} />
          ) : (
            <Button title="Place order" variant="lime" onPress={handlePlaceOrder} loading={isPending} disabled={!quote || quote.deliveryPricing?.status === 'UNPRICED'} style={styles.cta} />
          )}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Address form ─────────────────────────────────────────────────────────────

function AddressForm({ address, onChange, notes, onNotesChange, addressError, phoneError, pinError }: {
  address: DeliveryAddress;
  onChange: (a: DeliveryAddress) => void;
  notes: string;
  onNotesChange: (n: string) => void;
  addressError: boolean;
  phoneError: boolean;
  pinError: boolean;
}) {
  return (
    <View>
      <Text style={styles.label}>Deliver to</Text>
      <View style={styles.chips}>
        {['Site', 'Home', 'Office', 'Other'].map((lbl) => {
          const on = address.label === lbl;
          return (
            <Pressable
              key={lbl}
              style={[styles.chip, on && styles.chipOn]}
              onPress={() => onChange({ ...address, label: lbl })}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{lbl}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Full address</Text>
      <TextInput
        style={[styles.input, styles.inputMulti, addressError && styles.inputError]}
        value={address.fullAddress}
        onChangeText={(v) => onChange({ ...address, fullAddress: v })}
        placeholder="Door or plot number, street, area, city, PIN"
        placeholderTextColor={Colors.stoneLight}
        multiline
        numberOfLines={3}
        accessibilityLabel="Full delivery address"
      />
      {addressError ? <Text style={styles.fieldError}>Enter the address the driver should come to.</Text> : null}

      <Text style={styles.label}>PIN code</Text>
      <TextInput
        style={[styles.input, pinError && styles.inputError]}
        value={address.pincode ?? ''}
        onChangeText={(v) => onChange({ ...address, pincode: v.replace(/\D/g, '').slice(0, 6) })}
        placeholder="6-digit PIN of the site"
        placeholderTextColor={Colors.stoneLight}
        keyboardType="number-pad"
        maxLength={6}
        accessibilityLabel="Delivery PIN code"
      />
      {pinError ? <Text style={styles.fieldError}>Enter the 6-digit PIN code of the site.</Text> : null}

      <Text style={styles.label}>Phone at the site</Text>
      <TextInput
        style={[styles.input, phoneError && styles.inputError]}
        value={address.contactPhone}
        onChangeText={(v) => onChange({ ...address, contactPhone: v.replace(/\D/g, '') })}
        placeholder="10-digit mobile number"
        placeholderTextColor={Colors.stoneLight}
        keyboardType="phone-pad"
        maxLength={10}
        accessibilityLabel="Phone number at the delivery site"
      />
      {phoneError ? (
        <Text style={styles.fieldError}>Enter a 10-digit mobile number the driver can call.</Text>
      ) : (
        <Text style={styles.hint}>The driver calls this number on arrival.</Text>
      )}

      <Text style={styles.label}>Notes for the driver (optional)</Text>
      <TextInput
        style={[styles.input, styles.inputMulti]}
        value={notes}
        onChangeText={onNotesChange}
        placeholder="Landmark, gate, best time to call"
        placeholderTextColor={Colors.stoneLight}
        multiline
        numberOfLines={2}
        accessibilityLabel="Notes for the driver"
      />
    </View>
  );
}

// ─── Order summary ────────────────────────────────────────────────────────────

function OrderSummaryView({ quote, supplierName, address, notes }: {
  quote: OrderQuote;
  supplierName: string;
  address: DeliveryAddress;
  notes: string;
}) {
  const outOfStock = quote.items.filter((i) => !i.inStock);
  return (
    <View style={styles.summaryGap}>
      {outOfStock.length > 0 ? (
        <Notice tone="warning" title="Some items are short on stock">
          {`${outOfStock.map((i) => i.name).join(', ')}: the supplier has less than you asked for. Go back to the cart to change the quantity.`}
        </Notice>
      ) : null}

      <View style={styles.card}>
        <Eyebrow>From {supplierName}</Eyebrow>
        {quote.items.map((item) => (
          <View key={item.productId} style={styles.itemRow}>
            <View style={styles.flex}>
              <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.itemMeta}>
                {item.quantity} {item.unit} × {rupees(item.pricePerUnit)}{item.isGstInclusive ? ' incl. GST' : ''}
              </Text>
            </View>
            <Text style={styles.itemTotal}>{rupees(item.subtotal)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Eyebrow>Delivering to · {address.label}</Eyebrow>
        <Text style={styles.addressFull}>{address.fullAddress}</Text>
        <View style={styles.metaRow}>
          <Icon name="phone-outline" size={16} color={Colors.stone} />
          <Text style={styles.metaText}>{address.contactPhone}</Text>
        </View>
        {notes ? (
          <View style={styles.metaRow}>
            <Icon name="note-text-outline" size={16} color={Colors.stone} />
            <Text style={styles.metaText}>{notes}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Eyebrow>Price</Eyebrow>
        <PriceRow label="Subtotal" value={rupees(quote.subtotal)} />
        <PriceRow label="GST" value={rupees(quote.gstAmount)} />
        <PriceRow label="Delivery" value={quote.deliveryCharge > 0 ? rupees(quote.deliveryCharge) : 'No charge'} />
        {quote.deliveryPricing?.status === 'PRICED' ? (
          <Text style={styles.hint}>{quote.deliveryPricing.vehicle}, {quote.deliveryPricing.weightKg} kg, about {quote.deliveryPricing.distanceKm} km</Text>
        ) : null}
        {quote.deliveryPricing?.status === 'UNPRICED' ? <Text style={styles.fieldError}>{quote.deliveryPricing.message}</Text> : null}
        <View style={styles.totalRow}>
          <Text style={styles.totalRowLabel}>Total</Text>
          <Text style={styles.totalRowValue}>{rupees(quote.total)}</Text>
        </View>
      </View>

      <View style={styles.cod}>
        <Icon name="cash" size={24} color={Colors.ink} />
        <View style={styles.flex}>
          <Text style={styles.codTitle}>Cash on delivery</Text>
          <Text style={styles.codSub}>Pay {rupees(quote.total)} when the materials reach the site.</Text>
        </View>
      </View>
    </View>
  );
}

function PriceRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.priceRow}>
      <Text style={styles.priceLabel}>{label}</Text>
      <Text style={styles.priceValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.sand },
  flex: { flex: 1 },
  progress: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, marginBottom: 8 },
  progressBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: Colors.sand4 },
  progressOn: { backgroundColor: Colors.ink },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  spacer: { height: 24 },
  label: { fontFamily: Font.semiBold, fontSize: 14, color: Colors.ink, marginTop: 18, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 40, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: Colors.sand4, backgroundColor: Colors.sand2, justifyContent: 'center' },
  chipOn: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  chipText: { fontFamily: Font.semiBold, fontSize: 14, color: Colors.ink },
  chipTextOn: { color: Colors.sand },
  input: { fontFamily: Font.regular, borderWidth: 1.5, borderColor: Colors.sand4, borderRadius: 16, backgroundColor: Colors.sand2, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: Colors.ink },
  inputMulti: { minHeight: 88, textAlignVertical: 'top' },
  inputError: { borderColor: Colors.error },
  fieldError: { fontFamily: Font.regular, marginTop: 6, fontSize: 13, color: Colors.error },
  hint: { fontFamily: Font.regular, marginTop: 6, fontSize: 13, color: Colors.stone },
  loading: { alignItems: 'center', gap: 10, marginTop: 40 },
  loadingText: { fontFamily: Font.regular, fontSize: 14, color: Colors.stone },
  noticeText: { fontFamily: Font.regular, fontSize: 14, lineHeight: 20, color: Colors.ink },
  noticeLink: { fontFamily: Font.bold, fontSize: 14, color: Colors.ink, textDecorationLine: 'underline', marginTop: 6 },
  orderError: { marginTop: 16 },
  summaryGap: { gap: 12 },
  card: { padding: 16, borderRadius: 18, backgroundColor: Colors.sand2, borderWidth: 1, borderColor: Colors.sand4 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 12 },
  itemName: { fontFamily: Font.semiBold, fontSize: 15, lineHeight: 20, color: Colors.ink },
  itemMeta: { fontFamily: Font.regular, fontSize: 13, color: Colors.stone, marginTop: 2 },
  itemTotal: { fontFamily: Font.bold, fontSize: 15, color: Colors.ink },
  addressFull: { fontFamily: Font.regular, fontSize: 15, lineHeight: 21, color: Colors.ink, marginTop: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  metaText: { fontFamily: Font.regular, fontSize: 14, color: Colors.stone, flex: 1 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  priceLabel: { fontFamily: Font.regular, fontSize: 15, color: Colors.stone },
  priceValue: { fontFamily: Font.semiBold, fontSize: 15, color: Colors.ink },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.sand4 },
  totalRowLabel: { fontFamily: Font.bold, fontSize: 16, color: Colors.ink },
  totalRowValue: { fontFamily: Font.display, fontSize: 22, color: Colors.ink },
  cod: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18, backgroundColor: Colors.lime },
  codTitle: { fontFamily: Font.bold, fontSize: 15, color: Colors.ink },
  codSub: { fontFamily: Font.regular, fontSize: 14, lineHeight: 19, color: Colors.ink, marginTop: 2 },
  stickyBar: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, backgroundColor: Colors.ink, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  totalLabel: { fontFamily: Font.mono, fontSize: 11, letterSpacing: 1, color: 'rgba(242,239,231,0.6)', textTransform: 'uppercase' },
  totalValue: { fontFamily: Font.display, fontSize: 22, color: Colors.sand },
  cta: { flex: 1 },
});
