import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useOrder, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, type Order, type OrderStatus } from '../../../src/hooks/useOrders';
import { Colors } from '../../../src/constants/colors';

const STATUS_STEPS: OrderStatus[] = [
  'CONFIRMED', 'READY_FOR_PICKUP', 'ASSIGNED', 'PICKED_UP', 'DELIVERED',
];

function OrderTimeline({ status }: { status: OrderStatus }) {
  if (status === 'CANCELLED') {
    return (
      <View style={tl.row}>
        <View style={[tl.dot, { backgroundColor: Colors.error }]} />
        <Text style={[tl.label, { color: Colors.error }]}>Order Cancelled</Text>
      </View>
    );
  }
  const activeIdx = STATUS_STEPS.indexOf(status);
  return (
    <View style={tl.container}>
      {STATUS_STEPS.map((step, i) => {
        const done = i <= activeIdx;
        const active = i === activeIdx;
        return (
          <View key={step} style={tl.row}>
            <View style={tl.lineCol}>
              <View style={[tl.dot, done && tl.dotDone, active && tl.dotActive]} />
              {i < STATUS_STEPS.length - 1 && (
                <View style={[tl.line, i < activeIdx && tl.lineDone]} />
              )}
            </View>
            <Text style={[tl.label, done && tl.labelDone, active && tl.labelActive]}>
              {ORDER_STATUS_LABELS[step]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const tl = StyleSheet.create({
  container: { paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 40 },
  lineCol: { width: 28, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.border, marginTop: 4 },
  dotDone: { backgroundColor: Colors.success },
  dotActive: { backgroundColor: Colors.primary, width: 16, height: 16, borderRadius: 8, marginTop: 2 },
  line: { width: 2, flex: 1, backgroundColor: Colors.border, minHeight: 24, marginVertical: 2 },
  lineDone: { backgroundColor: Colors.success },
  label: { fontSize: 14, color: Colors.textMuted, paddingBottom: 16, paddingLeft: 8, flex: 1, marginTop: 2 },
  labelDone: { color: Colors.textSecondary },
  labelActive: { color: Colors.primary, fontWeight: '700' },
});

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useOrder(id);
  const order: Order | undefined = data?.data;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order</Text>
        </View>
        <View style={styles.center}>
          <Text style={{ color: Colors.textSecondary }}>Order not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = ORDER_STATUS_COLORS[order.status];
  const date = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{order.orderNumber}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
          <Text style={[styles.statusText, { color: statusColor.text }]}>
            {ORDER_STATUS_LABELS[order.status]}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
      >
        {/* Date */}
        <Text style={styles.date}>Placed on {date}</Text>

        {/* Timeline */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Status</Text>
          <OrderTimeline status={order.status} />
        </View>

        {/* Items */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Items Ordered</Text>
          {order.items.map((item, i) => (
            <View key={i} style={[styles.itemRow, i < order.items.length - 1 && styles.itemRowBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemMeta}>
                  {item.quantity} {item.unit} × ₹{item.pricePerUnit.toLocaleString('en-IN')}
                </Text>
              </View>
              <Text style={styles.itemTotal}>
                ₹{item.subtotal.toLocaleString('en-IN')}
              </Text>
            </View>
          ))}
        </View>

        {/* Delivery address */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Delivery Address</Text>
          <View style={styles.addressRow}>
            <Text style={styles.addressLabel}>{order.deliveryAddress.label}</Text>
            <Text style={styles.addressFull}>{order.deliveryAddress.fullAddress}</Text>
            {order.deliveryAddress.contactPhone ? (
              <Text style={styles.addressMeta}>📞 {order.deliveryAddress.contactPhone}</Text>
            ) : null}
          </View>
          {order.notes ? (
            <Text style={styles.notes}>📝 {order.notes}</Text>
          ) : null}
        </View>

        {/* Price summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Summary</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Subtotal</Text>
            <Text style={styles.priceVal}>₹{order.subtotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>GST</Text>
            <Text style={styles.priceVal}>₹{order.gstAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Delivery</Text>
            <Text style={[styles.priceVal, { color: Colors.success }]}>FREE</Text>
          </View>
          <View style={[styles.priceRow, styles.priceRowTotal]}>
            <Text style={styles.priceTotalLabel}>Total</Text>
            <Text style={styles.priceTotalVal}>₹{order.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
          </View>

          <View style={styles.codBadge}>
            <Text style={styles.codText}>💵 Cash on Delivery</Text>
            <View style={[styles.payBadge, { backgroundColor: order.paymentStatus === 'CAPTURED' ? Colors.successLight : Colors.warningLight }]}>
              <Text style={[styles.payBadgeText, { color: order.paymentStatus === 'CAPTURED' ? Colors.success : Colors.warning }]}>
                {order.paymentStatus === 'CAPTURED' ? 'Paid' : 'Payment Pending'}
              </Text>
            </View>
          </View>
        </View>

        {/* Review CTA if delivered */}
        {order.status === 'DELIVERED' && (
          <TouchableOpacity
            style={styles.reviewBtn}
            onPress={() => router.push({ pathname: '/(buyer)/review/[orderId]', params: { orderId: order._id } } as never)}
            activeOpacity={0.85}
          >
            <Text style={styles.reviewBtnIcon}>⭐</Text>
            <Text style={styles.reviewBtnText}>Rate this order</Text>
            <Text style={styles.reviewBtnArrow}>→</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surfaceAlt },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backBtn: { padding: 4, marginRight: 8 },
  backIcon: { fontSize: 20, color: Colors.text },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  scroll: { padding: 16, gap: 12 },
  date: { fontSize: 12, color: Colors.textMuted, marginBottom: 4 },
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 12 },
  itemRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  itemName: { fontSize: 14, fontWeight: '600', color: Colors.text, lineHeight: 18 },
  itemMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 3 },
  itemTotal: { fontSize: 14, fontWeight: '700', color: Colors.text, minWidth: 72, textAlign: 'right' },
  addressRow: { gap: 4 },
  addressLabel: { fontSize: 11, fontWeight: '700', color: Colors.primary, textTransform: 'uppercase' },
  addressFull: { fontSize: 14, color: Colors.text, lineHeight: 20 },
  addressMeta: { fontSize: 13, color: Colors.textSecondary },
  notes: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  priceLabel: { fontSize: 14, color: Colors.textSecondary },
  priceVal: { fontSize: 14, fontWeight: '600', color: Colors.text },
  priceRowTotal: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12, marginTop: 4 },
  priceTotalLabel: { fontSize: 15, fontWeight: '700', color: Colors.text },
  priceTotalVal: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  codBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  codText: { fontSize: 13, color: Colors.textSecondary },
  payBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  payBadgeText: { fontSize: 11, fontWeight: '700' },
  reviewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.primary,
  },
  reviewBtnIcon: { fontSize: 22 },
  reviewBtnText: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.primary },
  reviewBtnArrow: { fontSize: 18, color: Colors.primary },
});
