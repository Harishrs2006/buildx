import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../src/constants/colors';
import { useOpsSummary, type OpsSummary } from '../../src/hooks/useOps';
import { OpsOrderRow } from '../../src/components/OpsOrderRow';

const QUEUES: { key: keyof OpsSummary['attention']; title: string; hint: (t: Record<string, number>) => string }[] = [
  { key: 'unassigned', title: 'No driver yet', hint: (t) => `Ready for pickup > ${t.READY_UNASSIGNED_MINUTES} min — assign a driver or ask the supplier to deliver` },
  { key: 'notPickedUp', title: 'Driver not picked up', hint: (t) => `Assigned > ${t.ASSIGNED_MINUTES} min — call the driver or unassign` },
  { key: 'notDispatched', title: 'Supplier not dispatched', hint: (t) => `Confirmed > ${t.CONFIRMED_MINUTES} min — call the supplier` },
  { key: 'longInDelivery', title: 'Delivery taking long', hint: (t) => `On the road > ${Math.round(t.IN_DELIVERY_MINUTES / 60)} h` },
  { key: 'codPending', title: 'Cash not confirmed', hint: () => 'Delivered COD orders with no (or partial) cash recorded' },
];

export default function AttentionScreen() {
  const { data, isLoading, refetch, isRefetching, error } = useOpsSummary();
  const summary = data?.data;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
      >
        <Text style={styles.title}>Needs attention</Text>
        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 48 }} />
        ) : error ? (
          <Text style={styles.empty}>{error.message}</Text>
        ) : summary ? (
          <>
            <View style={styles.statsRow}>
              <Stat label="Today" value={summary.todayOrders} />
              <Stat label="New" value={summary.counts.CONFIRMED ?? 0} />
              <Stat label="On road" value={(summary.counts.PICKED_UP ?? 0) + (summary.counts.IN_TRANSIT ?? 0)} />
              <Stat label="Delivered" value={summary.counts.DELIVERED ?? 0} />
            </View>
            {QUEUES.map((q) => {
              const orders = summary.attention[q.key];
              return (
                <View key={q.key} style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    {q.title} {orders.length > 0 ? `(${orders.length})` : ''}
                  </Text>
                  <Text style={styles.hint}>{q.hint(summary.thresholds)}</Text>
                  {orders.length === 0 ? (
                    <Text style={styles.clear}>✓ All clear</Text>
                  ) : (
                    orders.map((o) => <OpsOrderRow key={o._id} order={o} />)
                  )}
                </View>
              );
            })}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surfaceAlt },
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  stat: { flex: 1, backgroundColor: Colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  hint: { fontSize: 12, color: Colors.textSecondary, marginBottom: 8, marginTop: 2 },
  clear: { fontSize: 13, color: Colors.success },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 48 },
});
