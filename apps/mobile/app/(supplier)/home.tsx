import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { Font } from '../../src/constants/typography';
import { useSupplierStats, useSupplierProfile, useSupplierOrders } from '../../src/hooks/useSupplier';
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '../../src/hooks/useOrders';
import { Button, Eyebrow, Icon, Pill, type IconName } from '../../src/components/ui';

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: 'lime' }) {
  return (
    <View style={[styles.stat, tone === 'lime' && styles.statLime]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Action({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.action, pressed && styles.actionPressed]} onPress={onPress} accessibilityRole="button">
      <View style={styles.actionIcon}><Icon name={icon} size={22} /></View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const rupeesShort = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}K` : `₹${Math.round(n)}`;

export default function SupplierHome() {
  const { data: profileData } = useSupplierProfile();
  const { data: statsData, isLoading, refetch, isRefetching } = useSupplierStats();
  const { data: ordersData } = useSupplierOrders('CONFIRMED');

  const profile = profileData?.data;
  const stats = statsData?.data;
  const toDispatch = ordersData?.data ?? [];
  const verified = profile?.verificationStatus === 'VERIFIED';

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.ink} />}
      >
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <Eyebrow color="rgba(242,239,231,0.6)">Your business</Eyebrow>
            <View style={[styles.verify, verified ? styles.verifyOn : styles.verifyOff]}>
              <Icon name={verified ? 'check-decagram' : 'timer-sand'} size={14} color={verified ? Colors.ink : Colors.sand} />
              <Text style={[styles.verifyText, verified && styles.verifyTextOn]}>{verified ? 'Verified' : 'Under review'}</Text>
            </View>
          </View>
          <Text style={styles.business} numberOfLines={2}>{profile?.businessName ?? ' '}</Text>
          {toDispatch.length > 0 ? (
            <Pressable style={styles.alert} onPress={() => router.push('/(supplier)/orders')} accessibilityRole="button">
              <View style={styles.alertDot} />
              <Text style={styles.alertText}>
                {toDispatch.length} order{toDispatch.length > 1 ? 's' : ''} to dispatch
              </Text>
              <Icon name="arrow-right" size={20} color={Colors.ink} />
            </Pressable>
          ) : (
            <Text style={styles.heroSub}>No orders waiting for you right now.</Text>
          )}
        </View>

        {isLoading ? (
          <ActivityIndicator color={Colors.ink} style={styles.loading} />
        ) : (
          <View style={styles.stats}>
            <Stat label="Orders today" value={stats?.todayOrders ?? 0} tone="lime" />
            <Stat label="Waiting" value={stats?.pendingOrders ?? 0} />
            <Stat label="Live products" value={stats?.activeProducts ?? 0} />
            <Stat label="Sales" value={rupeesShort(stats?.totalRevenue ?? 0)} />
          </View>
        )}

        <Eyebrow>Shortcuts</Eyebrow>
        <View style={styles.actions}>
          <Action icon="clipboard-text-outline" label="Orders" onPress={() => router.push('/(supplier)/orders')} />
          <Action icon="package-variant-closed" label="Products" onPress={() => router.push('/(supplier)/products')} />
          <Action icon="chart-line" label="Sales" onPress={() => router.push('/(supplier)/analytics' as never)} />
          <Action icon="calendar-check-outline" label="Weekly check" onPress={() => router.push('/(supplier)/weekly' as never)} />
        </View>
        <Button title="List a product" variant="lime" onPress={() => router.push('/(supplier)/product/add')} style={styles.cta} />

        {toDispatch.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Eyebrow>To dispatch</Eyebrow>
              <Pressable onPress={() => router.push('/(supplier)/orders')} hitSlop={8} accessibilityRole="button">
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>
            {toDispatch.slice(0, 3).map((order) => {
              const colors = ORDER_STATUS_COLORS[order.status];
              return (
                <Pressable key={order._id} style={styles.order} onPress={() => router.push('/(supplier)/orders')} accessibilityRole="button">
                  <View style={styles.orderTop}>
                    <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                    <Pill label={ORDER_STATUS_LABELS[order.status]} bg={colors.bg} color={colors.text} />
                  </View>
                  <View style={styles.orderBottom}>
                    <Text style={styles.orderBuyer}>{(order.buyerId as any)?.name ?? 'Buyer'}</Text>
                    <Text style={styles.orderTotal}>₹{order.total.toLocaleString('en-IN')}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.sand },
  scroll: { padding: 16, paddingBottom: 32 },
  loading: { marginVertical: 24 },
  hero: { padding: 20, borderRadius: 26, backgroundColor: Colors.ink },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  verify: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  verifyOn: { backgroundColor: Colors.lime },
  verifyOff: { backgroundColor: 'rgba(242,239,231,0.12)' },
  verifyText: { fontFamily: Font.semiBold, fontSize: 12, color: Colors.sand },
  verifyTextOn: { color: Colors.ink },
  business: { fontFamily: Font.display, fontSize: 28, lineHeight: 31, letterSpacing: -0.8, color: Colors.sand, marginTop: 10 },
  heroSub: { fontFamily: Font.regular, fontSize: 14, color: 'rgba(242,239,231,0.7)', marginTop: 10 },
  alert: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, paddingHorizontal: 14, height: 48, borderRadius: 24, backgroundColor: Colors.lime },
  alertDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.ink },
  alertText: { fontFamily: Font.bold, flex: 1, fontSize: 15, color: Colors.ink },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12, marginBottom: 22 },
  stat: { width: '48%', flexGrow: 1, padding: 16, borderRadius: 18, backgroundColor: Colors.sand2, borderWidth: 1, borderColor: Colors.sand4 },
  statLime: { backgroundColor: Colors.limeSoft, borderColor: Colors.lime },
  statValue: { fontFamily: Font.display, fontSize: 28, color: Colors.ink },
  statLabel: { fontFamily: Font.mono, fontSize: 10, letterSpacing: 1, color: Colors.stone, textTransform: 'uppercase', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  action: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 14, borderRadius: 18, backgroundColor: Colors.sand2, borderWidth: 1, borderColor: Colors.sand4 },
  actionPressed: { borderColor: Colors.ink },
  actionIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.sand, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontFamily: Font.semiBold, fontSize: 13, color: Colors.ink },
  cta: { marginTop: 12 },
  section: { marginTop: 24 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  seeAll: { fontFamily: Font.semiBold, fontSize: 14, color: Colors.ink, textDecorationLine: 'underline' },
  order: { padding: 14, marginBottom: 8, borderRadius: 18, backgroundColor: Colors.sand2, borderWidth: 1, borderColor: Colors.sand4 },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderNumber: { fontFamily: Font.monoBold, fontSize: 13, color: Colors.ink },
  orderBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  orderBuyer: { fontFamily: Font.regular, fontSize: 14, color: Colors.stone },
  orderTotal: { fontFamily: Font.bold, fontSize: 16, color: Colors.ink },
});
