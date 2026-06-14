import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../src/constants/colors';
import { useAvailableOrders, useAssignOrder, useDriverStats, useUpdateDriverProfile, type DeliveryOrder } from '../../src/hooks/useDelivery';

function OrderCard({ order, onAssign }: { order: DeliveryOrder; onAssign: (id: string) => void }) {
  const supplier = order.supplierId as any;
  const itemCount = order.items.length;
  const itemSummary = order.items.slice(0, 2).map((i) => `${i.name} (${i.quantity} ${i.unit})`).join(', ');

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.orderNumber}>{order.orderNumber}</Text>
        <View style={styles.codBadge}>
          <Text style={styles.codText}>COD ₹{order.total.toLocaleString('en-IN')}</Text>
        </View>
      </View>

      {/* Pickup */}
      <View style={styles.locationBlock}>
        <View style={styles.dot} />
        <View style={{ flex: 1 }}>
          <Text style={styles.locationLabel}>PICKUP</Text>
          <Text style={styles.locationValue}>{supplier?.businessName}</Text>
        </View>
      </View>

      <View style={styles.line} />

      {/* Drop */}
      <View style={styles.locationBlock}>
        <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.locationLabel}>DELIVER TO</Text>
          <Text style={styles.locationValue} numberOfLines={2}>{order.deliveryAddress.fullAddress}</Text>
          <Text style={styles.contactText}>Contact: {order.deliveryAddress.contactPhone}</Text>
        </View>
      </View>

      {/* Items summary */}
      <View style={styles.itemsRow}>
        <Text style={styles.itemsSummary} numberOfLines={1}>{itemSummary}{itemCount > 2 ? ` +${itemCount - 2} more` : ''}</Text>
      </View>

      {order.notes ? <Text style={styles.notes}>Note: {order.notes}</Text> : null}

      <TouchableOpacity style={styles.pickBtn} onPress={() => onAssign(order._id)}>
        <Text style={styles.pickBtnText}>Pick This Up</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AvailableOrdersScreen() {
  const { data: statsData, isLoading: statsLoading } = useDriverStats();
  const { data, isLoading, refetch, isRefetching } = useAvailableOrders();
  const { mutate: assignOrder } = useAssignOrder();
  const { mutate: updateProfile } = useUpdateDriverProfile();

  const stats = statsData?.data;
  const orders = data?.data ?? [];

  function handleAssign(id: string) {
    Alert.alert(
      'Pick up this order?',
      'You will be responsible for delivering this to the buyer.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Pick it up',
          onPress: () => {
            assignOrder(id, {
              onError: (err) => Alert.alert('Error', err.message || 'Order already taken. Pull to refresh.'),
            });
          },
        },
      ]
    );
  }

  function toggleAvailability(value: boolean) {
    updateProfile({ isAvailable: value });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Available Pickups</Text>
          <Text style={styles.subtitle}>{orders.length} order{orders.length !== 1 ? 's' : ''} near you</Text>
        </View>
        <View style={styles.availableToggle}>
          <Text style={styles.availableLabel}>{stats?.isAvailable ? 'Online' : 'Offline'}</Text>
          <Switch
            value={stats?.isAvailable ?? false}
            onValueChange={toggleAvailability}
            trackColor={{ false: Colors.border, true: Colors.success }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* Active orders banner */}
      {(stats?.activeOrders ?? 0) > 0 && (
        <View style={styles.activeBanner}>
          <Text style={styles.activeBannerText}>
            You have {stats?.activeOrders} active delivery{(stats?.activeOrders ?? 0) > 1 ? 'ies' : 'y'} — check My Deliveries tab
          </Text>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 48 }} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o._id}
          renderItem={({ item }) => <OrderCard order={item} onAssign={handleAssign} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📍</Text>
              <Text style={styles.emptyTitle}>No pickups right now</Text>
              <Text style={styles.emptySub}>Pull down to refresh. New orders appear here when suppliers mark them ready.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  availableToggle: { alignItems: 'center', gap: 4 },
  availableLabel: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary },
  activeBanner: { backgroundColor: Colors.infoLight, paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  activeBannerText: { fontSize: 13, color: Colors.info, fontWeight: '600' },
  list: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  orderNumber: { fontSize: 14, fontWeight: '700', color: Colors.text },
  codBadge: { backgroundColor: Colors.successLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  codText: { fontSize: 13, fontWeight: '700', color: Colors.success },
  locationBlock: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#6B7280', marginTop: 4 },
  line: { width: 1, height: 20, backgroundColor: Colors.border, marginLeft: 4.5, marginVertical: 4 },
  locationLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8, marginBottom: 2 },
  locationValue: { fontSize: 14, fontWeight: '600', color: Colors.text },
  contactText: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  itemsRow: { marginTop: 12, backgroundColor: Colors.surfaceAlt, borderRadius: 8, padding: 10 },
  itemsSummary: { fontSize: 12, color: Colors.textSecondary },
  notes: { fontSize: 12, color: Colors.textMuted, fontStyle: 'italic', marginTop: 8 },
  pickBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 14 },
  pickBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  emptyContainer: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
