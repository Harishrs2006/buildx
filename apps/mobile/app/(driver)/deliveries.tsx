import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { useMyDeliveries, useUpdateDeliveryStatus, type DeliveryOrder } from '../../src/hooks/useDelivery';
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, type OrderStatus } from '../../src/hooks/useOrders';

const TABS = [
  { key: '', label: 'All' },
  { key: 'ASSIGNED', label: 'Assigned' },
  { key: 'PICKED_UP', label: 'Picked Up' },
  { key: 'DELIVERED', label: 'Delivered' },
];

function DeliveryCard({ order, onUpdate }: { order: DeliveryOrder; onUpdate: (id: string, status: string) => void }) {
  const router = useRouter();
  const colors = ORDER_STATUS_COLORS[order.status] ?? { bg: '#F3F4F6', text: '#6B7280' };
  const supplier = order.supplierId as any;
  const buyer = order.buyerId as any;

  function handleAction() {
    if (order.status === 'ASSIGNED') {
      Alert.alert('Confirm Pickup', `You are picking up from ${supplier?.businessName}`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm Pickup', onPress: () => onUpdate(order._id, 'PICKED_UP') },
      ]);
    } else if (order.status === 'PICKED_UP') {
      Alert.alert('Confirm Delivery', 'Confirm that you have handed over the order to the buyer?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark Delivered', onPress: () => onUpdate(order._id, 'DELIVERED') },
      ]);
    }
  }

  const canUpdate = order.status === 'ASSIGNED' || order.status === 'PICKED_UP';

  return (
    <TouchableOpacity style={styles.card} onPress={() => router.push({ pathname: '/(driver)/order/[id]', params: { id: order._id } } as never)} activeOpacity={0.85}>
      <View style={styles.cardTop}>
        <Text style={styles.orderNumber}>{order.orderNumber}</Text>
        <View style={[styles.badge, { backgroundColor: colors.bg }]}>
          <Text style={[styles.badgeText, { color: colors.text }]}>
            {ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status}
          </Text>
        </View>
      </View>

      {/* Route */}
      <View style={styles.routeBlock}>
        <View style={styles.routeRow}>
          <View style={styles.dotGray} />
          <View style={{ flex: 1 }}>
            <Text style={styles.routeLabel}>PICKUP FROM</Text>
            <Text style={styles.routeValue}>{supplier?.businessName}</Text>
            <Text style={styles.routeSub}>{supplier?.whatsappNumber}</Text>
          </View>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routeRow}>
          <View style={styles.dotOrange} />
          <View style={{ flex: 1 }}>
            <Text style={styles.routeLabel}>DELIVER TO</Text>
            <Text style={styles.routeValue} numberOfLines={2}>{order.deliveryAddress.fullAddress}</Text>
            <Text style={styles.routeSub}>{buyer?.name} · {order.deliveryAddress.contactPhone}</Text>
          </View>
        </View>
      </View>

      {/* Items */}
      <View style={styles.itemsBox}>
        {order.items.map((item, i) => (
          <Text key={i} style={styles.itemText}>{item.name} — {item.quantity} {item.unit}</Text>
        ))}
      </View>

      {order.notes ? <Text style={styles.notes}>Note: {order.notes}</Text> : null}

      <View style={styles.cardBottom}>
        <View>
          <Text style={styles.totalAmount}>₹{order.total.toLocaleString('en-IN')}</Text>
          <Text style={styles.codLabel}>Collect on delivery</Text>
        </View>
        {canUpdate && (
          <TouchableOpacity style={styles.actionBtn} onPress={handleAction}>
            <Text style={styles.actionBtnText}>
              {order.status === 'ASSIGNED' ? 'Confirm Pickup' : 'Mark Delivered'}
            </Text>
          </TouchableOpacity>
        )}
        {order.status === 'DELIVERED' && (
          <View style={styles.doneTag}>
            <Text style={styles.doneTagText}>Completed</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function MyDeliveriesScreen() {
  const [tab, setTab] = useState('');
  const { data, isLoading, refetch, isRefetching } = useMyDeliveries(tab || undefined);
  const { mutate: updateStatus } = useUpdateDeliveryStatus();

  const orders = data?.data ?? [];

  function handleUpdate(id: string, status: string) {
    updateStatus({ id, status }, {
      onError: () => Alert.alert('Error', 'Failed to update. Try again.'),
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>My Deliveries</Text>
      </View>

      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabChip, tab === t.key && styles.tabChipActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 48 }} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o._id}
          renderItem={({ item }) => <DeliveryCard order={item} onUpdate={handleUpdate} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🚚</Text>
              <Text style={styles.emptyTitle}>No deliveries yet</Text>
              <Text style={styles.emptySub}>Pick up orders from the Available tab to see them here.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  tabChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
  tabChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: '#fff' },
  list: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  orderNumber: { fontSize: 14, fontWeight: '700', color: Colors.text },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  routeBlock: { marginBottom: 12 },
  routeRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  routeLine: { width: 1, height: 20, backgroundColor: Colors.border, marginLeft: 4.5, marginVertical: 4 },
  dotGray: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.textMuted, marginTop: 4 },
  dotOrange: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary, marginTop: 4 },
  routeLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8, marginBottom: 2 },
  routeValue: { fontSize: 14, fontWeight: '600', color: Colors.text },
  routeSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  itemsBox: { backgroundColor: Colors.surfaceAlt, borderRadius: 8, padding: 10, marginBottom: 10 },
  itemText: { fontSize: 12, color: Colors.text, marginBottom: 2 },
  notes: { fontSize: 12, color: Colors.textMuted, fontStyle: 'italic', marginBottom: 8 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12 },
  totalAmount: { fontSize: 16, fontWeight: '800', color: Colors.text },
  codLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  actionBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  doneTag: { backgroundColor: Colors.successLight, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  doneTagText: { fontSize: 12, fontWeight: '700', color: Colors.success },
  emptyContainer: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
