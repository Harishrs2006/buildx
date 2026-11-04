import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useOrder, ORDER_STATUS_LABELS, type Order, type OrderStatus } from '../../../src/hooks/useOrders';
import { Colors } from '../../../src/constants/colors';
import { Font } from '../../../src/constants/typography';
import { Button, EmptyState, Eyebrow, Icon, ScreenHeader } from '../../../src/components/ui';

const STATUS_STEPS: OrderStatus[] = ['CONFIRMED', 'READY_FOR_PICKUP', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'];
const rupees = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function OrderTimeline({ status }: { status: OrderStatus }) {
  if (status === 'CANCELLED' || status === 'DISPUTED') {
    return (
      <View style={tl.row}>
        <Icon name="close-circle" size={22} color={Colors.error} />
        <Text style={[tl.label, tl.labelProblem]}>{ORDER_STATUS_LABELS[status]}</Text>
      </View>
    );
  }
  // PENDING sits before the first step
  const activeIdx = STATUS_STEPS.indexOf(status);
  return (
    <View>
      {STATUS_STEPS.map((step, i) => {
        const done = i < activeIdx || status === 'DELIVERED';
        const active = i === activeIdx && status !== 'DELIVERED';
        return (
          <View key={step} style={tl.row}>
            <View style={tl.rail}>
              <View style={[tl.dot, done && tl.dotDone, active && tl.dotActive]}>
                {done ? <Icon name="check" size={12} color={Colors.ink} /> : null}
              </View>
              {i < STATUS_STEPS.length - 1 ? <View style={[tl.line, i < activeIdx && tl.lineDone]} /> : null}
            </View>
            <Text style={[tl.label, (done || active) && tl.labelDone, active && tl.labelActive]}>{ORDER_STATUS_LABELS[step]}</Text>
          </View>
        );
      })}
    </View>
  );
}

const tl = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rail: { width: 22, alignItems: 'center' },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.sand4, backgroundColor: Colors.sand2, alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: Colors.lime, borderColor: Colors.lime },
  dotActive: { borderColor: Colors.ink, borderWidth: 6 },
  line: { width: 2, height: 22, backgroundColor: Colors.sand4 },
  lineDone: { backgroundColor: Colors.ink },
  label: { fontFamily: Font.regular, fontSize: 15, color: Colors.stoneLight, paddingTop: 1, flex: 1 },
  labelDone: { color: Colors.stone },
  labelActive: { fontFamily: Font.bold, color: Colors.ink },
  labelProblem: { fontFamily: Font.bold, color: Colors.error },
});

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useOrder(id);
  const order: Order | undefined = data?.data;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={Colors.ink} style={styles.loading} />
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Order" onBack={() => router.back()} />
        <EmptyState
          icon="file-question-outline"
          title="We could not find this order"
          body="It may have been removed, or the connection dropped."
          action={<Button title="Try again" variant="ghost" onPress={() => refetch()} />}
        />
      </SafeAreaView>
    );
  }

  const date = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const paid = order.paymentStatus === 'CAPTURED';

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.ink} />}
      >
        <View style={styles.hero}>
          <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back">
            <Icon name="arrow-left" size={22} color={Colors.sand} />
          </Pressable>
          <Eyebrow color="rgba(242,239,231,0.6)">Order {order.orderNumber}</Eyebrow>
          <Text style={styles.heroStatus}>{ORDER_STATUS_LABELS[order.status]}</Text>
          <Text style={styles.heroDate}>Placed {date}</Text>
          <View style={styles.heroTotalRow}>
            <Text style={styles.heroTotal}>{rupees(order.total)}</Text>
            <View style={[styles.payPill, paid ? styles.payPaid : styles.payDue]}>
              <Text style={styles.payText}>{paid ? 'Paid' : order.paymentStatus === 'PARTIAL' ? 'Part paid' : 'Cash on delivery'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Eyebrow>Progress</Eyebrow>
          <View style={styles.cardBody}><OrderTimeline status={order.status} /></View>
        </View>

        <View style={styles.card}>
          <Eyebrow>Items</Eyebrow>
          {order.items.map((item, i) => (
            <View key={i} style={[styles.itemRow, i > 0 && styles.itemRowBorder]}>
              <View style={styles.flex}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemMeta}>{item.quantity} {item.unit} × {rupees(item.pricePerUnit)}</Text>
              </View>
              <Text style={styles.itemTotal}>{rupees(item.subtotal)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Eyebrow>Delivering to · {order.deliveryAddress.label}</Eyebrow>
          <Text style={styles.address}>{order.deliveryAddress.fullAddress}</Text>
          {order.deliveryAddress.contactPhone ? (
            <View style={styles.metaRow}>
              <Icon name="phone-outline" size={16} color={Colors.stone} />
              <Text style={styles.metaText}>{order.deliveryAddress.contactPhone}</Text>
            </View>
          ) : null}
          {order.notes ? (
            <View style={styles.metaRow}>
              <Icon name="note-text-outline" size={16} color={Colors.stone} />
              <Text style={styles.metaText}>{order.notes}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Eyebrow>Payment</Eyebrow>
          <PriceRow label="Subtotal" value={rupees(order.subtotal)} />
          <PriceRow label="GST" value={rupees(order.gstAmount)} />
          <PriceRow label="Delivery" value={order.deliveryCharge > 0 ? rupees(order.deliveryCharge) : 'No charge'} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{rupees(order.total)}</Text>
          </View>
        </View>

        {order.status === 'DELIVERED' ? (
          <Button
            title="Rate this order"
            variant="lime"
            onPress={() => router.push({ pathname: '/(buyer)/review/[orderId]', params: { orderId: order._id } } as never)}
            style={styles.review}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
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
  loading: { marginTop: 60 },
  scroll: { paddingBottom: 32 },
  hero: { margin: 12, padding: 20, borderRadius: 26, backgroundColor: Colors.ink },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(242,239,231,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroStatus: { fontFamily: Font.display, fontSize: 30, lineHeight: 32, letterSpacing: -1, color: Colors.lime, marginTop: 6 },
  heroDate: { fontFamily: Font.regular, fontSize: 14, color: 'rgba(242,239,231,0.7)', marginTop: 6 },
  heroTotalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(242,239,231,0.12)' },
  heroTotal: { fontFamily: Font.display, fontSize: 26, color: Colors.sand },
  payPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  payPaid: { backgroundColor: Colors.lime },
  payDue: { backgroundColor: 'rgba(242,239,231,0.14)' },
  payText: { fontFamily: Font.semiBold, fontSize: 13, color: Colors.sand },
  card: { marginHorizontal: 12, marginTop: 10, padding: 16, borderRadius: 18, backgroundColor: Colors.sand2, borderWidth: 1, borderColor: Colors.sand4 },
  cardBody: { marginTop: 14 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingTop: 12, marginTop: 12 },
  itemRowBorder: { borderTopWidth: 1, borderTopColor: Colors.sand4 },
  itemName: { fontFamily: Font.semiBold, fontSize: 15, lineHeight: 20, color: Colors.ink },
  itemMeta: { fontFamily: Font.regular, fontSize: 13, color: Colors.stone, marginTop: 2 },
  itemTotal: { fontFamily: Font.bold, fontSize: 15, color: Colors.ink },
  address: { fontFamily: Font.regular, fontSize: 15, lineHeight: 21, color: Colors.ink, marginTop: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  metaText: { fontFamily: Font.regular, fontSize: 14, color: Colors.stone, flex: 1 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  priceLabel: { fontFamily: Font.regular, fontSize: 15, color: Colors.stone },
  priceValue: { fontFamily: Font.semiBold, fontSize: 15, color: Colors.ink },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.sand4 },
  totalLabel: { fontFamily: Font.bold, fontSize: 16, color: Colors.ink },
  totalValue: { fontFamily: Font.display, fontSize: 22, color: Colors.ink },
  review: { marginHorizontal: 12, marginTop: 14 },
});
