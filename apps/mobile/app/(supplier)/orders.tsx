import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { Colors } from '../../src/constants/colors';
import { useSupplierOrders, useUpdateOrderStatus, type SupplierOrder } from '../../src/hooks/useSupplier';
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, type OrderStatus } from '../../src/hooks/useOrders';

const STATUS_TABS: { key: string; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'CONFIRMED', label: 'New' },
  { key: 'READY_FOR_PICKUP', label: 'Ready' },
  { key: 'DELIVERED', label: 'Delivered' },
];

function OrderCard({ order, onUpdateStatus }: { order: SupplierOrder; onUpdateStatus: (id: string, status: string) => void }) {
  const colors = ORDER_STATUS_COLORS[order.status];
  const buyer = (order.buyerId as any);

  function handleAction() {
    if (order.status === 'CONFIRMED') {
      Alert.alert('Ready for Pickup?', 'Mark this order as ready — delivery partners will see it and can pick it up.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark Ready', onPress: () => onUpdateStatus(order._id, 'READY_FOR_PICKUP') },
      ]);
    } else if (order.status === 'IN_TRANSIT') {
      Alert.alert('Mark Delivered?', 'Confirm that the buyer received this order.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark Delivered', onPress: () => onUpdateStatus(order._id, 'DELIVERED') },
      ]);
    }
  }

  const canUpdate = order.status === 'CONFIRMED' || order.status === 'IN_TRANSIT';

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

      <View style={styles.itemsList}>
        {order.items.map((item, i) => (
          <Text key={i} style={styles.itemText}>{item.name} — {item.quantity} {item.unit}</Text>
        ))}
      </View>

      {order.notes ? <Text style={styles.notes}>Note: {order.notes}</Text> : null}

      <View style={styles.cardBottom}>
        <Text style={styles.total}>₹{order.total.toLocaleString('en-IN')} COD</Text>
        {canUpdate && (
          <TouchableOpacity style={styles.actionBtn} onPress={handleAction}>
            <Text style={styles.actionBtnText}>
              {order.status === 'CONFIRMED' ? 'Mark Ready for Pickup' : 'Mark Delivered'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function SupplierOrdersScreen() {
  const [activeTab, setActiveTab] = useState('');
  const { data, isLoading, refetch, isRefetching } = useSupplierOrders(activeTab || undefined);
  const { mutate: updateStatus } = useUpdateOrderStatus();

  const orders = data?.data ?? [];

  function handleUpdateStatus(id: string, status: string) {
    updateStatus({ id, status }, {
      onError: () => Alert.alert('Error', 'Failed to update order status. Try again.'),
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
            renderItem={({ item }) => <OrderCard order={item} onUpdateStatus={handleUpdateStatus} />}
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
  tabs: { flexDirection: 'row', marginBottom: 16, gap: 8 },
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
  actionBtn: { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 80, fontSize: 15 },
});
