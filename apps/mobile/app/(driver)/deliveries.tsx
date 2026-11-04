import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { Font } from '../../src/constants/typography';
import { useMyDeliveries, useUpdateDeliveryStatus, type DeliveryOrder } from '../../src/hooks/useDelivery';
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, type OrderStatus } from '../../src/hooks/useOrders';
import { Button, ConfirmSheet, EmptyState, Icon, Notice, Pill, type } from '../../src/components/ui';
import { Route } from '../../src/components/Route';

const TABS = [
  { key: '', label: 'All' },
  { key: 'ASSIGNED', label: 'To pick up' },
  { key: 'PICKED_UP', label: 'On the way' },
  { key: 'DELIVERED', label: 'Delivered' },
];

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;

function DeliveryCard({ order, onAction }: { order: DeliveryOrder; onAction: (o: DeliveryOrder) => void }) {
  const router = useRouter();
  const colors = ORDER_STATUS_COLORS[order.status as OrderStatus] ?? { bg: Colors.sand3, text: Colors.stone };
  const supplier = order.supplierId as any;
  const buyer = order.buyerId as any;
  // Pick-up is one tap here; the later steps (on the way, delivered, cash) happen on the order screen
  const canPickUp = order.status === 'ASSIGNED';
  const openOrder = () => router.push({ pathname: '/(driver)/order/[id]', params: { id: order._id } } as never);
  const needsMore = order.status === 'PICKED_UP' || order.status === 'IN_TRANSIT' || (order.status === 'DELIVERED' && order.paymentStatus === 'PENDING');

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={openOrder}
      accessibilityRole="button"
      accessibilityLabel={`Order ${order.orderNumber}`}
    >
      <View style={styles.cardTop}>
        <Text style={styles.orderNumber}>{order.orderNumber}</Text>
        <Pill label={ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status} bg={colors.bg} color={colors.text} />
      </View>
      <Route
        from={supplier?.businessName}
        to={order.deliveryAddress.fullAddress}
        toPhone={[buyer?.name, order.deliveryAddress.contactPhone].filter(Boolean).join(' · ')}
      />
      <View style={styles.items}>
        {order.items.map((item, i) => (
          <View key={i} style={styles.itemRow}>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.itemQty}>{item.quantity} {item.unit}</Text>
          </View>
        ))}
      </View>
      {order.notes ? <Text style={styles.notes}>Note: {order.notes}</Text> : null}

      <View style={styles.bottom}>
        <View>
          <Text style={styles.total}>{rupees(order.total)}</Text>
          <Text style={styles.collect}>{order.paymentStatus === 'CAPTURED' ? 'Cash collected' : 'Collect in cash'}</Text>
        </View>
        {canPickUp ? (
          <Button title="Picked up" variant="lime" onPress={() => onAction(order)} style={styles.action} />
        ) : needsMore ? (
          <Button title={order.status === 'DELIVERED' ? 'Confirm cash' : 'Open'} variant="ink" onPress={openOrder} style={styles.action} />
        ) : order.status === 'DELIVERED' ? (
          <Icon name="check-circle" size={28} color={Colors.success} />
        ) : null}
      </View>
    </Pressable>
  );
}

export default function MyDeliveriesScreen() {
  const [tab, setTab] = useState('');
  const { data, isLoading, isError, refetch, isRefetching } = useMyDeliveries(tab || undefined);
  const { mutate: updateStatus, isPending } = useUpdateDeliveryStatus();
  const [acting, setActing] = useState<DeliveryOrder | null>(null);
  const [error, setError] = useState<string | null>(null);

  const orders = data?.data ?? [];
  const supplierName = (acting?.supplierId as any)?.businessName ?? 'the supplier';

  function confirm() {
    if (!acting) return;
    const order = acting;
    setError(null);
    updateStatus(
      { id: order._id, status: 'PICKED_UP' },
      {
        onSuccess: () => setActing(null),
        onError: (err) => { setActing(null); setError(`Could not update ${order.orderNumber}: ${err.message}`); },
      }
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <Text style={[type.title, styles.title]}>Deliveries</Text>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {TABS.map((t) => {
            const on = tab === t.key;
            return (
              <Pressable key={t.key} style={[styles.tab, on && styles.tabOn]} onPress={() => setTab(t.key)} accessibilityRole="tab" accessibilityState={{ selected: on }}>
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {error ? <Notice tone="error" onClose={() => setError(null)} style={styles.notice}>{error}</Notice> : null}

      {isLoading ? (
        <ActivityIndicator color={Colors.ink} style={styles.loading} />
      ) : isError ? (
        <Notice tone="error" title="We could not load your deliveries" style={styles.notice}>
          <Pressable onPress={() => refetch()} hitSlop={8} accessibilityRole="button"><Text style={styles.link}>Try again</Text></Pressable>
        </Notice>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o._id}
          renderItem={({ item }) => <DeliveryCard order={item} onAction={setActing} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.ink} />}
          ListEmptyComponent={
            <EmptyState icon="truck-outline" title="No deliveries here" body="Orders you pick up from the Pickups tab show up here." />
          }
        />
      )}

      <ConfirmSheet
        visible={!!acting}
        title="Picked up the material?"
        body={`Confirm you have collected ${acting?.orderNumber ?? 'the order'} from ${supplierName}.`}
        confirmLabel="Yes, picked up"
        cancelLabel="Not yet"
        loading={isPending}
        onConfirm={confirm}
        onCancel={() => setActing(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.sand },
  title: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  tabs: { paddingHorizontal: 20, gap: 8, paddingBottom: 12 },
  tab: { height: 38, paddingHorizontal: 16, borderRadius: 19, borderWidth: 1, borderColor: Colors.sand4, backgroundColor: Colors.sand2, justifyContent: 'center' },
  tabOn: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  tabText: { fontFamily: Font.semiBold, fontSize: 14, color: Colors.ink },
  tabTextOn: { color: Colors.sand },
  notice: { marginHorizontal: 20, marginBottom: 10 },
  link: { fontFamily: Font.bold, fontSize: 14, color: Colors.ink, textDecorationLine: 'underline', marginTop: 4 },
  loading: { marginTop: 48 },
  list: { paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  card: { padding: 16, borderRadius: 20, backgroundColor: Colors.sand2, borderWidth: 1, borderColor: Colors.sand4 },
  cardPressed: { borderColor: Colors.ink },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  orderNumber: { fontFamily: Font.monoBold, fontSize: 14, color: Colors.ink },
  items: { padding: 12, borderRadius: 14, backgroundColor: Colors.sand, gap: 6 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  itemName: { fontFamily: Font.medium, flex: 1, fontSize: 14, color: Colors.ink },
  itemQty: { fontFamily: Font.monoBold, fontSize: 13, color: Colors.ink },
  notes: { fontFamily: Font.regular, fontSize: 13, color: Colors.stone, marginTop: 8 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 14 },
  total: { fontFamily: Font.display, fontSize: 22, color: Colors.ink },
  collect: { fontFamily: Font.regular, fontSize: 13, color: Colors.stone },
  action: { minWidth: 140 },
});
