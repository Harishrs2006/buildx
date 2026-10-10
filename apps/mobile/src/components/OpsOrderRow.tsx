import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/colors';
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '../hooks/useOrders';
import type { OpsOrderSummary } from '../hooks/useOps';

export function ageLabel(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins}m`;
  if (mins < 48 * 60) return `${Math.round(mins / 60)}h`;
  return `${Math.round(mins / 1440)}d`;
}

export function OpsOrderRow({ order }: { order: OpsOrderSummary }) {
  const router = useRouter();
  const colors = ORDER_STATUS_COLORS[order.status];
  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: '/(ops)/order/[id]', params: { id: order._id } } as never)}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.number}>{order.orderNumber}</Text>
        <Text style={styles.sub} numberOfLines={1}>
          {order.supplierId?.businessName ?? 'Supplier'} · ₹{order.total.toLocaleString('en-IN')}
          {order.deliveryMode === 'SUPPLIER' ? ' · own vehicle' : ''}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <View style={[styles.badge, { backgroundColor: colors.bg }]}>
          <Text style={[styles.badgeText, { color: colors.text }]}>{ORDER_STATUS_LABELS[order.status]}</Text>
        </View>
        <Text style={styles.age}>{ageLabel(order.updatedAt)} ago</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12,
    padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.border,
  },
  number: { fontSize: 14, fontWeight: '700', color: Colors.text },
  sub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  age: { fontSize: 11, color: Colors.textMuted },
});
