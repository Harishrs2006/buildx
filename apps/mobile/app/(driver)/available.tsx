import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { Font } from '../../src/constants/typography';
import { useAvailableOrders, useAssignOrder, useDeclineOrder, useDriverStats, useUpdateDriverProfile, type DeliveryOrder } from '../../src/hooks/useDelivery';
import { Button, ChoiceSheet, ConfirmSheet, EmptyState, Eyebrow, Icon, Notice, type } from '../../src/components/ui';
import { Route } from '../../src/components/Route';

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;

const DECLINE_REASONS = ['Vehicle is busy', 'Too far for me', 'Load too big for my vehicle', 'Not available now'];

function OrderCard({ order, onAssign, onDecline }: { order: DeliveryOrder; onAssign: (o: DeliveryOrder) => void; onDecline: (o: DeliveryOrder) => void }) {
  const supplier = order.supplierId as any;
  const extra = order.items.length - 2;
  const itemSummary = order.items.slice(0, 2).map((i) => `${i.name} (${i.quantity} ${i.unit})`).join(', ');

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.orderNumber}>{order.orderNumber}</Text>
        <View style={styles.cod}><Text style={styles.codText}>Collect {rupees(order.total)}</Text></View>
      </View>
      <Route from={supplier?.businessName} to={order.deliveryAddress.fullAddress} toPhone={order.deliveryAddress.contactPhone} />
      <View style={styles.items}>
        <Icon name="package-variant-closed" size={16} color={Colors.stone} />
        <Text style={styles.itemsText} numberOfLines={2}>{itemSummary}{extra > 0 ? ` +${extra} more` : ''}</Text>
      </View>
      {(order as any).delivery ? (
        <Text style={styles.notes}>{(order as any).delivery.weightKg} kg · about {(order as any).delivery.distanceKm} km</Text>
      ) : null}
      {order.notes ? <Text style={styles.notes}>Note: {order.notes}</Text> : null}
      <View style={styles.row}>
        <Button title="Accept job" variant="lime" onPress={() => onAssign(order)} style={[styles.pick, styles.flex]} />
        {(order as any).driverOffer?.state === 'OFFERED' ? (
          <Button title="Decline" variant="ghost" onPress={() => onDecline(order)} style={styles.pick} />
        ) : null}
      </View>
    </View>
  );
}

export default function AvailableOrdersScreen() {
  const { data: statsData } = useDriverStats();
  // A driver Sthiva hasn't verified yet gets a message here instead of jobs
  const { data, isLoading, isError, error: loadError, refetch, isRefetching } = useAvailableOrders();
  const { mutate: assignOrder, isPending: assigning } = useAssignOrder();
  const { mutate: updateProfile, isPending: toggling } = useUpdateDriverProfile();
  const { mutate: declineOrder } = useDeclineOrder();
  const [picking, setPicking] = useState<DeliveryOrder | null>(null);
  const [declining, setDeclining] = useState<DeliveryOrder | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stats = statsData?.data;
  const orders = data?.data ?? [];
  const online = stats?.isAvailable ?? false;
  const active = stats?.activeOrders ?? 0;

  function decline(reason: string) {
    if (!declining) return;
    const id = declining._id;
    setDeclining(null);
    setError(null);
    declineOrder({ id, reason }, { onError: (err) => setError(err.message), onSettled: () => refetch() });
  }

  function confirmPick() {
    if (!picking) return;
    setError(null);
    assignOrder(picking._id, {
      onSuccess: () => {
        setPicking(null);
        router.push('/(driver)/deliveries');
      },
      onError: (err) => {
        setPicking(null);
        setError(err.message || 'Someone else took this order. Pull down to refresh.');
        refetch();
      },
    });
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Eyebrow>{orders.length} offered to you</Eyebrow>
          <Text style={[type.title, styles.title]}>Jobs</Text>
        </View>
        <View style={[styles.toggle, online && styles.toggleOn]}>
          <Text style={[styles.toggleText, online && styles.toggleTextOn]}>{online ? 'Online' : 'Offline'}</Text>
          <Switch
            value={online}
            onValueChange={(value) => updateProfile({ isAvailable: value })}
            disabled={toggling}
            trackColor={{ false: Colors.sand4, true: Colors.ink }}
            thumbColor={online ? Colors.lime : Colors.sand2}
            accessibilityLabel="Available for pickups"
          />
        </View>
      </View>

      {active > 0 ? (
        <Pressable style={styles.active} onPress={() => router.push('/(driver)/deliveries')} accessibilityRole="button">
          <Icon name="truck-fast-outline" size={20} color={Colors.ink} />
          <Text style={styles.activeText}>{active} {active > 1 ? 'deliveries' : 'delivery'} in progress</Text>
          <Icon name="arrow-right" size={20} color={Colors.ink} />
        </Pressable>
      ) : null}

      {error ? <Notice tone="error" onClose={() => setError(null)} style={styles.notice}>{error}</Notice> : null}

      {isLoading ? (
        <ActivityIndicator color={Colors.ink} style={styles.loading} />
      ) : isError ? (
        <Notice tone="error" title="We could not load jobs" style={styles.notice}>
          {loadError?.message ? <Text style={styles.notes}>{loadError.message}</Text> : null}
          <Pressable onPress={() => refetch()} hitSlop={8} accessibilityRole="button"><Text style={styles.link}>Try again</Text></Pressable>
        </Notice>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o._id}
          renderItem={({ item }) => <OrderCard order={item} onAssign={setPicking} onDecline={setDeclining} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.ink} />}
          ListEmptyComponent={
            <EmptyState
              icon="map-marker-radius-outline"
              title="No jobs right now"
              body={online ? 'Sthiva offers you a job when an order near you is ready. You get a notification.' : 'You are offline. Go online to get jobs.'}
            />
          }
        />
      )}

      <ChoiceSheet
        visible={!!declining}
        title="Why can't you take it?"
        body="Sthiva offers it to another driver."
        options={DECLINE_REASONS.map((r) => ({ label: r, onPress: () => decline(r) }))}
        cancelLabel="Back"
        onCancel={() => setDeclining(null)}
      />
      <ConfirmSheet
        visible={!!picking}
        title="Accept this job?"
        body={picking ? `You deliver ${picking.orderNumber} and collect ${rupees(picking.total)} in cash from the buyer.` : undefined}
        confirmLabel="Yes, I will deliver it"
        loading={assigning}
        onConfirm={confirmPick}
        onCancel={() => setPicking(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.sand },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  title: { marginTop: 6 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 12, paddingRight: 4, height: 44, borderRadius: 22, backgroundColor: Colors.sand2, borderWidth: 1, borderColor: Colors.sand4 },
  toggleOn: { backgroundColor: Colors.limeSoft, borderColor: Colors.lime },
  toggleText: { fontFamily: Font.bold, fontSize: 13, color: Colors.stone },
  toggleTextOn: { color: Colors.ink },
  active: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, marginBottom: 10, paddingHorizontal: 16, height: 52, borderRadius: 26, backgroundColor: Colors.lime },
  activeText: { fontFamily: Font.bold, flex: 1, fontSize: 15, color: Colors.ink },
  notice: { marginHorizontal: 20, marginBottom: 10 },
  link: { fontFamily: Font.bold, fontSize: 14, color: Colors.ink, textDecorationLine: 'underline', marginTop: 4 },
  loading: { marginTop: 48 },
  list: { paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  card: { padding: 16, borderRadius: 20, backgroundColor: Colors.sand2, borderWidth: 1, borderColor: Colors.sand4 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  orderNumber: { fontFamily: Font.monoBold, fontSize: 14, color: Colors.ink },
  cod: { backgroundColor: Colors.ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  codText: { fontFamily: Font.bold, fontSize: 13, color: Colors.lime },
  items: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 14, backgroundColor: Colors.sand },
  itemsText: { fontFamily: Font.regular, flex: 1, fontSize: 13, lineHeight: 18, color: Colors.ink },
  notes: { fontFamily: Font.regular, fontSize: 13, color: Colors.stone, marginTop: 8 },
  pick: { marginTop: 14 },
  row: { flexDirection: 'row', gap: 10 },
});
