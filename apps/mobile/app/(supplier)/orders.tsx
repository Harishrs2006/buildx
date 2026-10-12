import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { Colors } from '../../src/constants/colors';
import { useSupplierOrders, useUpdateOrderStatus, useConfirmSupplierCod, type SupplierOrder } from '../../src/hooks/useSupplier';
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '../../src/hooks/useOrders';

const STATUS_TABS: { key: string; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'CONFIRMED', label: 'New' },
  { key: 'READY_FOR_PICKUP', label: 'Ready' },
  { key: 'IN_TRANSIT', label: 'On the way' },
  { key: 'DELIVERED', label: 'Delivered' },
];

const REJECT_REASONS = ['Out of stock', "Can't deliver to this area", 'Price changed'];

type Handlers = {
  onUpdateStatus: (id: string, status: string, reason?: string) => void;
  onConfirmCash: (id: string, amount: number) => void;
};

const rupees = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function OrderCard({ order, onUpdateStatus, onConfirmCash }: { order: SupplierOrder } & Handlers) {
  const colors = ORDER_STATUS_COLORS[order.status];
  const buyer = (order.buyerId as any);
  const selfDelivery = order.deliveryMode === 'SUPPLIER';

  function dispatch() {
    Alert.alert('How will this order be delivered?', 'Choose who takes the material to the buyer.', [
      { text: 'BuildX delivery partner', onPress: () => onUpdateStatus(order._id, 'READY_FOR_PICKUP') },
      { text: 'My own vehicle', onPress: () => onUpdateStatus(order._id, 'IN_TRANSIT') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function takeOver() {
    Alert.alert('Deliver it yourself?', 'No delivery partner has accepted this order yet. Take it with your own vehicle?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes, I am delivering', onPress: () => onUpdateStatus(order._id, 'IN_TRANSIT') },
    ]);
  }

  function reject() {
    Alert.alert('Reject this order?', 'Stock will be returned and the buyer notified. Why are you rejecting it?', [
      ...REJECT_REASONS.map((r) => ({ text: r, style: 'destructive' as const, onPress: () => onUpdateStatus(order._id, 'CANCELLED', r) })),
      { text: 'Keep order', style: 'cancel' },
    ]);
  }

  function markDelivered() {
    Alert.alert('Mark delivered?', 'Confirm the buyer has received all the material.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delivered', onPress: () => onUpdateStatus(order._id, 'DELIVERED') },
    ]);
  }

  function confirmCash() {
    Alert.alert('Cash collected?', `Confirm you received exactly ${rupees(order.total)} in cash from the buyer.`, [
      { text: 'Not yet', style: 'cancel' },
      { text: 'Yes, collected', onPress: () => onConfirmCash(order._id, order.total) },
    ]);
  }

  // Delivery progress on BuildX-driver orders is updated by the assigned delivery partner
  const actions: { label: string; onPress: () => void; tone?: 'danger' }[] = [];
  if (order.status === 'CONFIRMED') actions.push({ label: 'Dispatch', onPress: dispatch });
  if (order.status === 'READY_FOR_PICKUP') actions.push({ label: 'Deliver myself', onPress: takeOver });
  if (order.status === 'CONFIRMED' || order.status === 'READY_FOR_PICKUP') actions.push({ label: 'Reject', onPress: reject, tone: 'danger' });
  if (order.status === 'IN_TRANSIT' && selfDelivery) actions.push({ label: 'Mark Delivered', onPress: markDelivered });
  if (order.status === 'DELIVERED' && selfDelivery && order.paymentStatus === 'PENDING') {
    actions.push({ label: `Confirm ${rupees(order.total)} cash`, onPress: confirmCash });
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.orderNumber}>{order.orderNumber}</Text>
        <View style={[styles.badge, { backgroundColor: colors.bg }]}>
          <Text style={[styles.badgeText, { color: colors.text }]}>{ORDER_STATUS_LABELS[order.status]}</Text>
        </View>
      </View>

      <View style={styles.buyerRow}>
        <Text style={styles.buyerName}>{buyer?.name ?? 'Buyer'}</Text>
        <Text style={styles.buyerPhone}>{buyer?.phone}</Text>
      </View>

      <Text style={styles.address} numberOfLines={2}>{order.deliveryAddress.fullAddress}</Text>
      <Text style={styles.contact}>Contact: {order.deliveryAddress.contactPhone}</Text>
      {order.deliveryMode ? (
        <Text style={styles.contact}>{selfDelivery ? '🚚 Your vehicle' : '🛵 BuildX delivery partner'}</Text>
      ) : null}

      <View style={styles.itemsList}>
        {order.items.map((item, i) => (
          <Text key={i} style={styles.itemText}>{item.name} — {item.quantity} {item.unit}</Text>
        ))}
      </View>

      {order.notes ? <Text style={styles.notes}>Note: {order.notes}</Text> : null}

      <View style={styles.cardBottom}>
        <Text style={styles.total}>
          {rupees(order.total)} COD{order.paymentStatus === 'CAPTURED' ? ' ✓ paid' : ''}
        </Text>
        <View style={styles.actionsRow}>
          {actions.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={[styles.actionBtn, a.tone === 'danger' && styles.actionBtnDanger]}
              onPress={a.onPress}
            >
              <Text style={[styles.actionBtnText, a.tone === 'danger' && styles.actionBtnTextDanger]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

export default function SupplierOrdersScreen() {
  const [activeTab, setActiveTab] = useState('');
  const { data, isLoading, refetch, isRefetching } = useSupplierOrders(activeTab || undefined);
  const { mutate: updateStatus } = useUpdateOrderStatus();
  const { mutate: confirmCod } = useConfirmSupplierCod();

  const orders = data?.data ?? [];

  function handleUpdateStatus(id: string, status: string, reason?: string) {
    updateStatus({ id, status, reason }, {
      onError: (err) => Alert.alert('Could not update order', err.message),
    });
  }

  function handleConfirmCash(id: string, amount: number) {
    confirmCod({ id, amount }, {
      onError: (err) => Alert.alert('Could not confirm cash', err.message),
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Incoming Orders</Text>

        <View style={styles.tabs}>
          {STATUS_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 48 }} />
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(o) => o._id}
            renderItem={({ item }) => <OrderCard order={item} onUpdateStatus={handleUpdateStatus} onConfirmCash={handleConfirmCash} />}
            contentContainerStyle={{ paddingBottom: 32 }}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
            ListEmptyComponent={<Text style={styles.empty}>No orders{activeTab ? ` with status ${activeTab}` : ''}</Text>}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 16 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, gap: 8 },
  tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderNumber: { fontSize: 14, fontWeight: '700', color: Colors.text },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  buyerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  buyerName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  buyerPhone: { fontSize: 13, color: Colors.textSecondary },
  address: { fontSize: 12, color: Colors.textSecondary, marginBottom: 2 },
  contact: { fontSize: 12, color: Colors.textSecondary, marginBottom: 8 },
  itemsList: { backgroundColor: Colors.surfaceAlt, borderRadius: 8, padding: 10, marginBottom: 8 },
  itemText: { fontSize: 12, color: Colors.text, marginBottom: 2 },
  notes: { fontSize: 12, color: Colors.textMuted, fontStyle: 'italic', marginBottom: 8 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10 },
  total: { fontSize: 15, fontWeight: '700', color: Colors.text },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, flex: 1, marginLeft: 8 },
  actionBtn: { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  actionBtnDanger: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.error },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  actionBtnTextDanger: { color: Colors.error },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 80, fontSize: 15 },
});
