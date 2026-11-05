import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Linking, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMyDeliveries, useUpdateDeliveryStatus, useConfirmCodCollected, useReportDeliveryProblem, type DeliveryOrder } from '../../../src/hooks/useDelivery';
import { ORDER_STATUS_LABELS, type OrderStatus } from '../../../src/hooks/useOrders';
import { Colors } from '../../../src/constants/colors';
import { Font } from '../../../src/constants/typography';
import { Button, ChoiceSheet, ConfirmSheet, EmptyState, Eyebrow, Icon, Notice, ScreenHeader } from '../../../src/components/ui';

const PROBLEMS = ['Buyer not at the site', 'Buyer not answering the phone', 'Site closed or no access', 'Buyer refused the goods'];

const NEXT_STATUS: Record<string, { label: string; status: OrderStatus; ask: string } | null> = {
  ASSIGNED: { label: 'Picked up', status: 'PICKED_UP', ask: 'Confirm you have collected the material from the supplier.' },
  PICKED_UP: { label: 'On the way', status: 'IN_TRANSIT', ask: 'Let the buyer know the material is on its way.' },
  IN_TRANSIT: { label: 'Delivered', status: 'DELIVERED', ask: 'Ask the buyer for their 4-digit delivery code (on their order screen) after they check the material.' },
};

const rupees = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const time = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null);

function CallButton({ label, phone }: { label: string; phone: string }) {
  return (
    <Pressable style={styles.call} onPress={() => Linking.openURL(`tel:${phone}`)} accessibilityRole="button" accessibilityLabel={`${label}, ${phone}`}>
      <Icon name="phone" size={18} color={Colors.ink} />
      <Text style={styles.callText}>{label}</Text>
    </Pressable>
  );
}

export default function DriverOrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, refetch } = useMyDeliveries();
  const { mutate: updateStatus, isPending } = useUpdateDeliveryStatus();
  const { mutate: confirmCod, isPending: codPending } = useConfirmCodCollected();
  const { mutate: reportProblem } = useReportDeliveryProblem();
  const [sheet, setSheet] = useState<'status' | 'cash' | 'problem' | null>(null);
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const order: DeliveryOrder | undefined = data?.data.find((o) => o._id === id);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={Colors.ink} style={styles.loading} />
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Delivery" onBack={() => router.back()} />
        <EmptyState icon="file-question-outline" title="We could not find this delivery" action={<Button title="Try again" variant="ghost" onPress={() => refetch()} />} />
      </SafeAreaView>
    );
  }

  const supplier = order.supplierId as any;
  const next = NEXT_STATUS[order.status];
  const cashPending = order.status === 'DELIVERED' && order.paymentStatus === 'PENDING';
  const cashCollected = order.paymentStatus === 'CAPTURED';

  function doStatus() {
    if (!order || !next) return;
    setError(null);
    // After DELIVERED the screen stays open so the driver can confirm the cash
    if (next.status === 'DELIVERED' && code.length !== 4) { setSheet(null); setError('Enter the 4-digit code from the buyer.'); return; }
    updateStatus({ id: order._id, status: next.status, ...(next.status === 'DELIVERED' ? { otp: code } : {}) }, {
      onSuccess: () => { setSheet(null); setCode(''); },
      onError: (err) => { setSheet(null); setError(err.message); },
    });
  }

  function doProblem(reason: string) {
    if (!order) return;
    setSheet(null);
    setError(null);
    reportProblem({ id: order._id, reason }, {
      onSuccess: () => setNotice('Reported. Sthiva will call you and the buyer.'),
      onError: (err) => setError(err.message),
    });
  }

  // Delivery doesn't mark COD as paid: the driver confirms the exact amount separately
  function doCash() {
    if (!order) return;
    setError(null);
    confirmCod({ id: order._id, amount: order.total }, {
      onSuccess: () => { setSheet(null); router.back(); },
      onError: (err) => { setSheet(null); setError(err.message); },
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader eyebrow={ORDER_STATUS_LABELS[order.status]} title={order.orderNumber} onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.cash}>
          <Eyebrow color="rgba(242,239,231,0.6)">{cashCollected ? 'Cash collected' : 'Collect in cash'}</Eyebrow>
          <Text style={styles.cashAmount}>{rupees(order.total)}</Text>
          <Text style={styles.cashNote}>{cashCollected ? 'Recorded. Thank you.' : 'Take exactly this amount from the buyer at the site.'}</Text>
        </View>

        <View style={styles.card}>
          <Eyebrow>Pick up from</Eyebrow>
          <Text style={styles.value}>{supplier?.businessName ?? 'Supplier'}</Text>
          {supplier?.whatsappNumber ? <CallButton label="Call supplier" phone={supplier.whatsappNumber} /> : null}
        </View>

        <View style={[styles.card, styles.drop]}>
          <Eyebrow>Deliver to · {order.deliveryAddress.label}</Eyebrow>
          <Text style={styles.value}>{order.deliveryAddress.fullAddress}</Text>
          {order.deliveryAddress.contactPhone ? <CallButton label="Call buyer" phone={order.deliveryAddress.contactPhone} /> : null}
        </View>

        <View style={styles.card}>
          <Eyebrow>Items</Eyebrow>
          {order.items.map((item, i) => (
            <View key={i} style={[styles.itemRow, i > 0 && styles.itemBorder]}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemQty}>{item.quantity} {item.unit}</Text>
            </View>
          ))}
        </View>

        {order.notes ? (
          <View style={styles.card}>
            <Eyebrow>Buyer note</Eyebrow>
            <Text style={styles.note}>{order.notes}</Text>
          </View>
        ) : null}

        {order.assignedAt || order.pickedUpAt ? (
          <View style={styles.card}>
            <Eyebrow>Times</Eyebrow>
            {order.assignedAt ? <Text style={styles.time}>Accepted at {time(order.assignedAt)}</Text> : null}
            {order.pickedUpAt ? <Text style={styles.time}>Picked up at {time(order.pickedUpAt)}</Text> : null}
          </View>
        ) : null}

        {error ? <Notice tone="error" title="Not updated" onClose={() => setError(null)}>{error}</Notice> : null}
        {notice ? <Notice tone="success" onClose={() => setNotice(null)}>{notice}</Notice> : null}
        {['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(order.status) ? (
          <Button title="Report a problem" variant="ghost" onPress={() => setSheet('problem')} />
        ) : null}
      </ScrollView>

      {next || cashPending ? (
        <SafeAreaView edges={['bottom']} style={styles.bottom}>
          {next ? (
            <Button title={next.label} variant="lime" onPress={() => setSheet('status')} />
          ) : (
            <Button title={`Confirm ${rupees(order.total)} collected`} variant="lime" onPress={() => setSheet('cash')} />
          )}
        </SafeAreaView>
      ) : null}

      <ConfirmSheet
        visible={sheet === 'status' && !!next}
        title={next ? `Mark as ${next.label.toLowerCase()}?` : ''}
        body={next?.ask}
        confirmLabel={next ? `Yes, ${next.label.toLowerCase()}` : 'Yes'}
        cancelLabel="Not yet"
        loading={isPending}
        onConfirm={doStatus}
        onCancel={() => setSheet(null)}
      >
        {next?.status === 'DELIVERED' ? (
          <TextInput
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 4))}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="Code"
            placeholderTextColor={Colors.stone}
            style={styles.code}
            accessibilityLabel="Buyer's 4-digit delivery code"
          />
        ) : null}
      </ConfirmSheet>
      <ChoiceSheet
        visible={sheet === 'problem'}
        title="What went wrong?"
        body="Sthiva's team calls you and the buyer to sort it out."
        options={PROBLEMS.map((r) => ({ label: r, onPress: () => doProblem(r) }))}
        cancelLabel="Back"
        onCancel={() => setSheet(null)}
      />
      <ConfirmSheet
        visible={sheet === 'cash'}
        title="Cash collected?"
        body={`Confirm you received exactly ${rupees(order.total)} in cash from the buyer.`}
        confirmLabel="Yes, collected"
        cancelLabel="Not yet"
        loading={codPending}
        onConfirm={doCash}
        onCancel={() => setSheet(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.sand },
  loading: { marginTop: 60 },
  scroll: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  cash: { padding: 20, borderRadius: 24, backgroundColor: Colors.ink },
  cashAmount: { fontFamily: Font.display, fontSize: 36, letterSpacing: -1, color: Colors.lime, marginTop: 6 },
  cashNote: { fontFamily: Font.regular, fontSize: 14, color: 'rgba(242,239,231,0.72)', marginTop: 4 },
  card: { padding: 16, borderRadius: 18, backgroundColor: Colors.sand2, borderWidth: 1, borderColor: Colors.sand4 },
  drop: { borderColor: Colors.ink, borderWidth: 1.5 },
  value: { fontFamily: Font.semiBold, fontSize: 16, lineHeight: 22, color: Colors.ink, marginTop: 6 },
  call: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, marginTop: 12, borderRadius: 23, backgroundColor: Colors.lime },
  callText: { fontFamily: Font.bold, fontSize: 15, color: Colors.ink },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingTop: 10, marginTop: 10 },
  itemBorder: { borderTopWidth: 1, borderTopColor: Colors.sand4 },
  itemName: { fontFamily: Font.medium, flex: 1, fontSize: 15, color: Colors.ink },
  itemQty: { fontFamily: Font.monoBold, fontSize: 14, color: Colors.ink },
  note: { fontFamily: Font.regular, fontSize: 15, lineHeight: 21, color: Colors.ink, marginTop: 6 },
  time: { fontFamily: Font.regular, fontSize: 14, color: Colors.stone, marginTop: 6 },
  code: { fontFamily: Font.monoBold, fontSize: 28, letterSpacing: 10, textAlign: 'center', height: 60, marginTop: 12, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.ink, color: Colors.ink, backgroundColor: Colors.sand },
  bottom: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, backgroundColor: Colors.sand, borderTopWidth: 1, borderTopColor: Colors.sand4 },
});
