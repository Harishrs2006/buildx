import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useOrders, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, type Order } from '../../src/hooks/useOrders';
import { Colors } from '../../src/constants/colors';

function OrderCard({ order }: { order: Order }) {
  const router = useRouter();
  const statusColor = ORDER_STATUS_COLORS[order.status];
  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
  const date = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/(buyer)/order/[id]', params: { id: order._id } } as never)}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.orderNum}>{order.orderNumber}</Text>
          <Text style={styles.orderDate}>{date}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
          <Text style={[styles.statusText, { color: statusColor.text }]}>
            {ORDER_STATUS_LABELS[order.status]}
          </Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.cardBody}>
        <Text style={styles.itemSummary} numberOfLines={1}>
          {order.items.map((i) => i.name).join(', ')}
        </Text>
        <Text style={styles.itemCount}>{itemCount} item{itemCount !== 1 ? 's' : ''}</Text>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>
          ₹{order.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function OrdersScreen() {
  const router = useRouter();
  const { data, isLoading, isRefetching, refetch } = useOrders();
  const orders: Order[] = data?.data ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 52, marginBottom: 16 }}>📦</Text>
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptySub}>Browse materials and place your first order!</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => router.replace('/(buyer)/home' as never)}>
            <Text style={styles.browseBtnText}>Browse products</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <OrderCard order={item} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />
          }
        />
      )}
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
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: Colors.text },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border,
    padding: 16, gap: 12,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderNum: { fontSize: 14, fontWeight: '700', color: Colors.text },
  orderDate: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardDivider: { height: 1, backgroundColor: Colors.border },
  cardBody: { gap: 3 },
  itemSummary: { fontSize: 13, color: Colors.text, fontWeight: '500' },
  itemCount: { fontSize: 12, color: Colors.textMuted },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 13, color: Colors.textSecondary },
  totalValue: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: 28 },
  browseBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  browseBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
