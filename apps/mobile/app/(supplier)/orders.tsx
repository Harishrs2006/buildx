import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { Colors } from '../../src/constants/colors';
import { Font } from '../../src/constants/typography';
import { useSupplierOrders, useUpdateOrderStatus, useConfirmSupplierCod, useAnswerOffer, type SupplierOrder } from '../../src/hooks/useSupplier';
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '../../src/hooks/useOrders';
import { ChoiceSheet, ConfirmSheet, EmptyState, Icon, Notice, Pill, type } from '../../src/components/ui';

const STATUS_TABS: { key: string; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'PENDING', label: 'New' },
  { key: 'CONFIRMED', label: 'To dispatch' },
  { key: 'READY_FOR_PICKUP', label: 'Ready' },
  { key: 'IN_TRANSIT', label: 'On the way' },
  { key: 'DELIVERED', label: 'Delivered' },
];

const REJECT_REASONS = ['Out of stock', "Can't deliver to this area", 'Price changed'];
const DECLINE_REASONS = ['Out of stock', "Can't deliver to this area", "Can't deliver in time", 'Price changed'];

type SheetKind = 'accept' | 'decline' | 'dispatch' | 'takeover' | 'reject' | 'delivered' | 'cash';

function timeLeft(iso?: string) {
  if (!iso) return null;
  const m = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  return m <= 0 ? 'Time is up' : `${m} min left to answer`;
}

const rupees = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function OrderCard({ order, onAction }: { order: SupplierOrder; onAction: (kind: SheetKind, order: SupplierOrder) => void }) {
  const colors = ORDER_STATUS_COLORS[order.status];
  const buyer = order.buyerId as any;
  const selfDelivery = order.deliveryMode === 'SUPPLIER';

  // Delivery progress on Sthiva-driver orders is updated by the assigned delivery partner
  const actions: { label: string; kind: SheetKind; tone: 'primary' | 'plain' | 'danger' }[] = [];
  const isOffer = order.status === 'PENDING' && order.allocation?.state === 'OFFERED';
  if (isOffer) {
    actions.push({ label: 'Accept', kind: 'accept', tone: 'primary' });
    actions.push({ label: 'Reject', kind: 'decline', tone: 'danger' });
  }
  if (order.status === 'CONFIRMED') actions.push({ label: 'Dispatch', kind: 'dispatch', tone: 'primary' });
  if (order.status === 'READY_FOR_PICKUP') actions.push({ label: 'Deliver myself', kind: 'takeover', tone: 'plain' });
  if (order.status === 'CONFIRMED' || order.status === 'READY_FOR_PICKUP') actions.push({ label: 'Cancel order', kind: 'reject', tone: 'danger' });
  if (order.status === 'IN_TRANSIT' && selfDelivery) actions.push({ label: 'Mark delivered', kind: 'delivered', tone: 'primary' });
  if (order.status === 'DELIVERED' && selfDelivery && order.paymentStatus === 'PENDING') {
    actions.push({ label: `Confirm ${rupees(order.total)} cash`, kind: 'cash', tone: 'primary' });
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.orderNumber}>{order.orderNumber}</Text>
        <Pill label={ORDER_STATUS_LABELS[order.status]} bg={colors.bg} color={colors.text} />
      </View>

      <Text style={styles.buyer}>{buyer?.name ?? 'Buyer'}</Text>
      <View style={styles.meta}>
        <Icon name="map-marker-outline" size={16} color={Colors.stone} />
        <Text style={styles.metaText} numberOfLines={2}>{order.deliveryAddress.fullAddress}</Text>
      </View>
      <View style={styles.meta}>
        <Icon name="phone-outline" size={16} color={Colors.stone} />
        <Text style={styles.metaText}>{order.deliveryAddress.contactPhone || buyer?.phone || 'No phone given'}</Text>
      </View>
      {order.deliveryMode ? (
        <View style={styles.meta}>
          <Icon name={selfDelivery ? 'truck-outline' : 'moped-outline'} size={16} color={Colors.stone} />
          <Text style={styles.metaText}>{selfDelivery ? 'Your vehicle' : 'Sthiva delivery partner'}</Text>
        </View>
      ) : null}

      <View style={styles.items}>
        {order.items.map((item, i) => (
          <View key={i} style={styles.itemRow}>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.itemQty}>{item.quantity} {item.unit}</Text>
          </View>
        ))}
      </View>

      {isOffer ? (
        <Text style={styles.notes}>
          Sthiva offered you this order. Accept only if you can supply every item.{timeLeft(order.allocation?.expiresAt) ? ` ${timeLeft(order.allocation?.expiresAt)}.` : ''}
        </Text>
      ) : null}
      {order.notes ? <Text style={styles.notes}>Note: {order.notes}</Text> : null}

      <View style={styles.totalRow}>
        <Text style={styles.total}>{rupees(order.total)}</Text>
        <Text style={styles.payment}>{order.paymentStatus === 'CAPTURED' ? 'Cash collected' : 'Cash on delivery'}</Text>
      </View>

      {actions.length > 0 ? (
        <View style={styles.actions}>
          {actions.map((a) => (
            <Pressable
              key={a.label}
              style={[styles.action, a.tone === 'primary' && styles.actionPrimary, a.tone === 'danger' && styles.actionDanger]}
              onPress={() => onAction(a.kind, order)}
              accessibilityRole="button"
            >
              <Text style={[styles.actionText, a.tone === 'danger' && styles.actionTextDanger]}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function SupplierOrdersScreen() {
  const [activeTab, setActiveTab] = useState('');
  const { data, isLoading, isError, refetch, isRefetching } = useSupplierOrders(activeTab || undefined);
  const { mutate: updateStatus, isPending: updating } = useUpdateOrderStatus();
  const { mutate: confirmCod, isPending: confirming } = useConfirmSupplierCod();
  const { mutate: answerOffer, isPending: answering } = useAnswerOffer();
  const [sheet, setSheet] = useState<{ kind: SheetKind; order: SupplierOrder } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const orders = data?.data ?? [];
  const close = () => setSheet(null);

  // Choice sheets close at once (no double taps); confirm sheets stay open with a spinner
  function setStatus(status: string, reason?: string, closeNow = false) {
    if (!sheet) return;
    const order = sheet.order;
    setError(null);
    if (closeNow) close();
    updateStatus(
      { id: order._id, status, reason },
      { onSuccess: close, onError: (err) => { close(); setError(`Could not update ${order.orderNumber}: ${err.message}`); } }
    );
  }

  function answer(accept: boolean, reason?: string) {
    if (!sheet) return;
    const order = sheet.order;
    setError(null);
    if (!accept) close();
    answerOffer(
      { id: order._id, accept, reason },
      { onSuccess: close, onError: (err) => { close(); setError(`Could not answer ${order.orderNumber}: ${err.message}`); } }
    );
  }

  function confirmCash() {
    if (!sheet) return;
    setError(null);
    confirmCod(
      { id: sheet.order._id, amount: sheet.order.total },
      { onSuccess: close, onError: (err) => { close(); setError(`Could not confirm cash: ${err.message}`); } }
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <Text style={[type.title, styles.title]}>Orders</Text>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {STATUS_TABS.map((tab) => {
            const on = activeTab === tab.key;
            return (
              <Pressable key={tab.key} style={[styles.tab, on && styles.tabOn]} onPress={() => setActiveTab(tab.key)} accessibilityRole="tab" accessibilityState={{ selected: on }}>
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {error ? <Notice tone="error" onClose={() => setError(null)} style={styles.notice}>{error}</Notice> : null}

      {isLoading ? (
        <ActivityIndicator color={Colors.ink} style={styles.loading} />
      ) : isError ? (
        <Notice tone="error" title="We could not load your orders" style={styles.notice}>
          <Pressable onPress={() => refetch()} hitSlop={8} accessibilityRole="button"><Text style={styles.link}>Try again</Text></Pressable>
        </Notice>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o._id}
          renderItem={({ item }) => <OrderCard order={item} onAction={(kind, order) => setSheet({ kind, order })} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.ink} />}
          ListEmptyComponent={
            <EmptyState
              icon="clipboard-text-outline"
              title={activeTab ? 'Nothing here' : 'No orders yet'}
              body={activeTab ? 'No orders with this status right now.' : 'New orders from buyers show up here.'}
            />
          }
        />
      )}

      <ConfirmSheet
        visible={sheet?.kind === 'accept'}
        title="Accept this order?"
        body="You confirm you can supply every item at this quantity. The buyer is told it is confirmed."
        confirmLabel="Yes, accept"
        loading={answering}
        onConfirm={() => answer(true)}
        onCancel={close}
      />
      <ChoiceSheet
        visible={sheet?.kind === 'decline'}
        title="Why can't you take it?"
        body="Sthiva offers it to another supplier. The buyer is not told your reason."
        options={DECLINE_REASONS.map((r) => ({ label: r, danger: true, onPress: () => answer(false, r) }))}
        cancelLabel="Back"
        onCancel={close}
      />
      <ChoiceSheet
        visible={sheet?.kind === 'dispatch'}
        title="Who delivers this order?"
        body="Choose who takes the material to the buyer."
        options={[
          { label: 'Sthiva delivery partner', hint: 'A Sthiva driver picks it up from you.', icon: 'moped-outline', onPress: () => setStatus('READY_FOR_PICKUP', undefined, true) },
          { label: 'My own vehicle', hint: 'You deliver and collect the cash.', icon: 'truck-outline', onPress: () => setStatus('IN_TRANSIT', undefined, true) },
        ]}
        onCancel={close}
      />
      <ChoiceSheet
        visible={sheet?.kind === 'reject'}
        title="Why are you cancelling it?"
        body="The stock goes back to your listing and the buyer is told."
        options={REJECT_REASONS.map((r) => ({ label: r, danger: true, onPress: () => setStatus('CANCELLED', r, true) }))}
        cancelLabel="Keep the order"
        onCancel={close}
      />
      <ConfirmSheet
        visible={sheet?.kind === 'takeover'}
        title="Deliver it yourself?"
        body="No delivery partner has taken this order yet. You can deliver it with your own vehicle."
        confirmLabel="Yes, I am delivering"
        loading={updating}
        onConfirm={() => setStatus('IN_TRANSIT')}
        onCancel={close}
      />
      <ConfirmSheet
        visible={sheet?.kind === 'delivered'}
        title="Mark as delivered?"
        body="Confirm the buyer has received all the material."
        confirmLabel="Delivered"
        loading={updating}
        onConfirm={() => setStatus('DELIVERED')}
        onCancel={close}
      />
      <ConfirmSheet
        visible={sheet?.kind === 'cash'}
        title="Cash collected?"
        body={sheet ? `Confirm you received exactly ${rupees(sheet.order.total)} in cash from the buyer.` : undefined}
        confirmLabel="Yes, collected"
        cancelLabel="Not yet"
        loading={confirming}
        onConfirm={confirmCash}
        onCancel={close}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.sand },
  title: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  tabs: { paddingHorizontal: 20, gap: 8, paddingBottom: 12 },
  tab: { height: 38, paddingHorizontal: 16, borderRadius: 19, borderWidth: 1, borderColor: Colors.sand4, backgroundColor: Colors.sand2, justifyContent: 'center' },
  tabOn: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  tabText: { fontFamily: Font.semiBold, fontSize: 14, color: Colors.ink },
  tabTextOn: { color: Colors.sand },
  notice: { marginHorizontal: 20, marginBottom: 10 },
  link: { fontFamily: Font.bold, fontSize: 14, color: Colors.ink, textDecorationLine: 'underline', marginTop: 4 },
  loading: { marginTop: 48 },
  list: { paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  card: { padding: 16, borderRadius: 20, backgroundColor: Colors.sand2, borderWidth: 1, borderColor: Colors.sand4 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderNumber: { fontFamily: Font.monoBold, fontSize: 14, color: Colors.ink },
  buyer: { fontFamily: Font.bold, fontSize: 17, color: Colors.ink, marginTop: 10 },
  meta: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 6 },
  metaText: { fontFamily: Font.regular, flex: 1, fontSize: 14, lineHeight: 19, color: Colors.stone },
  items: { marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: Colors.sand, gap: 6 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  itemName: { fontFamily: Font.medium, flex: 1, fontSize: 14, color: Colors.ink },
  itemQty: { fontFamily: Font.monoBold, fontSize: 13, color: Colors.ink },
  notes: { fontFamily: Font.regular, fontSize: 13, color: Colors.stone, marginTop: 10, fontStyle: 'italic' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 12 },
  total: { fontFamily: Font.display, fontSize: 22, color: Colors.ink },
  payment: { fontFamily: Font.semiBold, fontSize: 13, color: Colors.stone },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  action: { flexGrow: 1, height: 46, paddingHorizontal: 16, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(11,12,10,0.18)' },
  actionPrimary: { backgroundColor: Colors.lime, borderColor: Colors.lime },
  actionDanger: { backgroundColor: Colors.errorLight, borderColor: Colors.errorLight },
  actionText: { fontFamily: Font.bold, fontSize: 15, color: Colors.ink },
  actionTextDanger: { color: Colors.error },
});
