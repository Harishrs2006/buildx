import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../src/lib/api';
import { Colors } from '../../src/constants/colors';

type DayRevenue = { date: string; revenue: number; orders: number };
type TopProduct = { _id: string; name: string; totalSold: number; basePrice: number; unit: string };
type StatusCount = { _id: string; count: number };

type Analytics = {
  revenueByDay: DayRevenue[];
  topProducts: TopProduct[];
  orderStatusBreakdown: StatusCount[];
};

function useAnalytics() {
  return useQuery<{ data: Analytics }>({
    queryKey: ['supplier-analytics'],
    queryFn: () => api.get('/suppliers/me/analytics').then((r) => r.data),
    staleTime: 60_000,
  });
}

function RevenueBar({ day, maxRevenue }: { day: DayRevenue; maxRevenue: number }) {
  const height = maxRevenue > 0 ? Math.max(4, (day.revenue / maxRevenue) * 100) : 4;
  const label = new Date(day.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' });
  return (
    <View style={bar.col}>
      <Text style={bar.amount}>{day.revenue > 0 ? `₹${(day.revenue / 1000).toFixed(1)}k` : ''}</Text>
      <View style={[bar.bar, { height }]} />
      <Text style={bar.label}>{label}</Text>
      {day.orders > 0 && <Text style={bar.orders}>{day.orders}</Text>}
    </View>
  );
}

const bar = StyleSheet.create({
  col: { flex: 1, alignItems: 'center', gap: 4 },
  amount: { fontSize: 9, color: Colors.textMuted, height: 14 },
  bar: { width: 28, backgroundColor: Colors.primary, borderRadius: 6, minHeight: 4 },
  label: { fontSize: 10, color: Colors.textSecondary },
  orders: { fontSize: 9, color: Colors.textMuted },
});

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: 'Confirmed', READY_FOR_PICKUP: 'Ready', ASSIGNED: 'Driver Assigned',
  PICKED_UP: 'Picked Up', IN_TRANSIT: 'In Transit', DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled', DISPUTED: 'Disputed',
};
const STATUS_COLOR: Record<string, string> = {
  DELIVERED: Colors.success, CANCELLED: Colors.error, CONFIRMED: Colors.info,
};

export default function AnalyticsScreen() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useAnalytics();
  const analytics = data?.data;

  const maxRev = analytics
    ? Math.max(...analytics.revenueByDay.map((d) => d.revenue), 1)
    : 1;

  const totalWeekRevenue = analytics?.revenueByDay.reduce((s, d) => s + d.revenue, 0) ?? 0;
  const totalWeekOrders = analytics?.revenueByDay.reduce((s, d) => s + d.orders, 0) ?? 0;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Text style={s.backIcon}>←</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Analytics</Text>
      </View>

      {isLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
        >
          {/* Summary */}
          <View style={s.summaryRow}>
            <View style={s.summaryCard}>
              <Text style={s.summaryNum}>₹{(totalWeekRevenue / 1000).toFixed(1)}K</Text>
              <Text style={s.summaryLabel}>7-Day Revenue</Text>
            </View>
            <View style={s.summaryCard}>
              <Text style={s.summaryNum}>{totalWeekOrders}</Text>
              <Text style={s.summaryLabel}>7-Day Orders</Text>
            </View>
          </View>

          {/* Revenue chart */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Daily Revenue (Last 7 Days)</Text>
            <View style={s.chartRow}>
              {analytics?.revenueByDay.map((day) => (
                <RevenueBar key={day.date} day={day} maxRevenue={maxRev} />
              ))}
            </View>
          </View>

          {/* Top products */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Top Selling Products</Text>
            {analytics?.topProducts.length === 0 && (
              <Text style={s.emptyText}>No sales yet</Text>
            )}
            {analytics?.topProducts.map((p, i) => (
              <View key={p._id} style={[s.topRow, i < (analytics.topProducts.length - 1) && s.topRowBorder]}>
                <View style={s.rankBadge}><Text style={s.rankText}>{i + 1}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.topName} numberOfLines={1}>{p.name}</Text>
                  <Text style={s.topMeta}>₹{p.basePrice.toLocaleString('en-IN')} / {p.unit}</Text>
                </View>
                <View style={s.soldBadge}>
                  <Text style={s.soldText}>{p.totalSold} sold</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Order status breakdown */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Order Status Breakdown</Text>
            {analytics?.orderStatusBreakdown.map((item) => (
              <View key={item._id} style={s.breakdownRow}>
                <View style={[s.breakdownDot, { backgroundColor: STATUS_COLOR[item._id] ?? Colors.border }]} />
                <Text style={s.breakdownLabel}>{STATUS_LABEL[item._id] ?? item._id}</Text>
                <Text style={s.breakdownCount}>{item.count}</Text>
              </View>
            ))}
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surfaceAlt },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  back: { padding: 4, marginRight: 8 },
  backIcon: { fontSize: 20, color: Colors.text },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, gap: 12 },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  summaryNum: { fontSize: 24, fontWeight: '800', color: Colors.primary },
  summaryLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 14 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', height: 140, gap: 4 },
  emptyText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', paddingVertical: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  topRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  rankBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  topName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  topMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  soldBadge: { backgroundColor: Colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  soldText: { fontSize: 12, fontWeight: '700', color: Colors.primaryDark },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  breakdownDot: { width: 10, height: 10, borderRadius: 5 },
  breakdownLabel: { flex: 1, fontSize: 14, color: Colors.textSecondary },
  breakdownCount: { fontSize: 15, fontWeight: '700', color: Colors.text },
});
