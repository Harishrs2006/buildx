import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { useSupplierStats, useSupplierProfile, useSupplierOrders } from '../../src/hooks/useSupplier';
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '../../src/hooks/useOrders';

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function SupplierHome() {
  const { data: profileData } = useSupplierProfile();
  const { data: statsData, isLoading, refetch, isRefetching } = useSupplierStats();
  const { data: ordersData } = useSupplierOrders('CONFIRMED');

  const profile = profileData?.data;
  const stats = statsData?.data;
  const recentOrders = (ordersData?.data ?? []).slice(0, 3);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good day,</Text>
            <Text style={styles.businessName} numberOfLines={1}>{profile?.businessName ?? '...'}</Text>
          </View>
          <View style={[styles.verifiedBadge, { backgroundColor: profile?.verificationStatus === 'VERIFIED' ? '#D1FAE5' : '#FEF3C7' }]}>
            <Text style={[styles.verifiedText, { color: profile?.verificationStatus === 'VERIFIED' ? '#065F46' : '#92400E' }]}>
              {profile?.verificationStatus === 'VERIFIED' ? 'Verified' : 'Pending'}
            </Text>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: 32 }} />
        ) : (
          <View style={styles.statsGrid}>
            <StatCard label="Today's Orders" value={stats?.todayOrders ?? 0} color="#3B82F6" />
            <StatCard label="Pending" value={stats?.pendingOrders ?? 0} color={Colors.primary} />
            <StatCard label="Active Products" value={stats?.activeProducts ?? 0} color="#10B981" />
            <StatCard label="Revenue" value={`₹${((stats?.totalRevenue ?? 0) / 1000).toFixed(1)}K`} color="#8B5CF6" />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(supplier)/orders')}>
              <Text style={styles.actionIcon}>📦</Text>
              <Text style={styles.actionLabel}>Orders</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(supplier)/product/add')}>
              <Text style={styles.actionIcon}>➕</Text>
              <Text style={styles.actionLabel}>Add Product</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(supplier)/products')}>
              <Text style={styles.actionIcon}>🏭</Text>
              <Text style={styles.actionLabel}>Products</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(supplier)/profile')}>
              <Text style={styles.actionIcon}>👤</Text>
              <Text style={styles.actionLabel}>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(supplier)/analytics' as never)}>
              <Text style={styles.actionIcon}>📊</Text>
              <Text style={styles.actionLabel}>Analytics</Text>
            </TouchableOpacity>
          </View>
        </View>

        {recentOrders.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Pending Orders</Text>
              <TouchableOpacity onPress={() => router.push('/(supplier)/orders')}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            {recentOrders.map((order) => {
              const colors = ORDER_STATUS_COLORS[order.status];
              return (
                <TouchableOpacity key={order._id} style={styles.orderCard} onPress={() => router.push('/(supplier)/orders')}>
                  <View style={styles.orderTop}>
                    <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
                      <Text style={[styles.badgeText, { color: colors.text }]}>{ORDER_STATUS_LABELS[order.status]}</Text>
                    </View>
                  </View>
                  <Text style={styles.orderBuyer}>{(order.buyerId as any)?.name ?? 'Buyer'}</Text>
                  <Text style={styles.orderTotal}>₹{order.total.toLocaleString('en-IN')}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  greeting: { fontSize: 13, color: Colors.textSecondary },
  businessName: { fontSize: 20, fontWeight: '700', color: Colors.text, maxWidth: 220 },
  verifiedBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  verifiedText: { fontSize: 12, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingVertical: 8, gap: 10 },
  statCard: { width: '47%', backgroundColor: '#fff', borderRadius: 12, padding: 16, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  statValue: { fontSize: 26, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  seeAll: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 8, width: '23%', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  actionIcon: { fontSize: 22, marginBottom: 6 },
  actionLabel: { fontSize: 10, color: Colors.text, fontWeight: '600', textAlign: 'center' },
  orderCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  orderNumber: { fontSize: 13, fontWeight: '700', color: Colors.text },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  orderBuyer: { fontSize: 13, color: Colors.textSecondary },
  orderTotal: { fontSize: 15, fontWeight: '700', color: Colors.text, marginTop: 4 },
});
