import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Linking, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../../src/constants/colors';
import { ORDER_STATUS_LABELS } from '../../../src/hooks/useOrders';
import {
  useOpsOrder, useOpsDrivers, useOpsCancel, useOpsUnassign, useOpsAssign, useOpsRecordCod, useOpsAddNote,
} from '../../../src/hooks/useOps';

const rupees = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function OpsOrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, error } = useOpsOrder(id);
  const order = data?.data;

  // One reason/note box shared by every action that needs one
  const [reason, setReason] = useState('');
  const [codAmount, setCodAmount] = useState('');
  const [restock, setRestock] = useState(true);
  const [pickDriver, setPickDriver] = useState(false);

  const cancel = useOpsCancel();
  const unassign = useOpsUnassign();
  const assign = useOpsAssign();
  const recordCod = useOpsRecordCod();
  const addNote = useOpsAddNote();
  const drivers = useOpsDrivers(pickDriver);
  const busy = cancel.isPending || unassign.isPending || assign.isPending || recordCod.isPending || addNote.isPending;

  if (isLoading || !order) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          {isLoading ? <ActivityIndicator color={Colors.primary} /> : <Text>{error?.message ?? 'Order not found'}</Text>}
        </View>
      </SafeAreaView>
    );
  }

  const status = order.status;
  const goodsLeftSupplier = status === 'PICKED_UP' || status === 'IN_TRANSIT';
  const canCancel = !['DELIVERED', 'CANCELLED', 'DISPUTED', 'PENDING'].includes(status);
  const canRecordCod = status === 'DELIVERED' && (order.paymentStatus === 'PENDING' || order.paymentStatus === 'PARTIAL');
  const needReason = () => {
    if (reason.trim().length < 3) {
      Alert.alert('Reason needed', 'Type a short reason in the box first — it is saved on the order.');
      return false;
    }
    return true;
  };
  const done = (msg: string) => ({
    onSuccess: () => { setReason(''); setCodAmount(''); Alert.alert('Done', msg); },
    onError: (err: Error) => Alert.alert('Failed', err.message),
  });

  function doCancel() {
    if (!needReason()) return;
    const stockLine = goodsLeftSupplier
      ? restock ? 'Goods returned — stock will be restored.' : 'Goods NOT returned — stock stays deducted.'
      : 'Stock will be restored.';
    Alert.alert('Cancel this order?', `${stockLine}\nThe buyer will be notified.`, [
      { text: 'Back', style: 'cancel' },
      {
        text: 'Cancel order',
        style: 'destructive',
        onPress: () => cancel.mutate({ id: order!._id, reason: reason.trim(), restock: goodsLeftSupplier ? restock : undefined }, done('Order cancelled')),
      },
    ]);
  }

  function doUnassign() {
    if (!needReason()) return;
    unassign.mutate({ id: order!._id, reason: reason.trim() }, done('Driver removed — order is back in the pickup pool'));
  }

  function doRecordCod() {
    const amount = Number(codAmount);
    if (!Number.isFinite(amount) || amount <= 0) return Alert.alert('Amount needed', 'Enter the total cash received so far.');
    if (!needReason()) return;
    recordCod.mutate({ id: order!._id, amount, note: reason.trim() }, done(amount === order!.total ? 'Marked fully paid' : 'Recorded as partially paid'));
  }

  function doNote() {
    if (!reason.trim()) return;
    addNote.mutate({ id: order!._id, note: reason.trim() }, done('Note added'));
  }

  const buyer = order.buyerId;
  const supplier = order.supplierId;
  const driver = order.driverId;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Text style={s.backIcon}>←</Text></TouchableOpacity>
        <Text style={s.headerTitle}>{order.orderNumber}</Text>
        <Text style={s.status}>{ORDER_STATUS_LABELS[status]}</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.card}>
          <Row label="Total" value={`${rupees(order.total)} COD · ${order.paymentStatus}${order.codAmountCollected ? ` (${rupees(order.codAmountCollected)} received)` : ''}`} />
          <Row label="Delivery" value={order.deliveryMode === 'SUPPLIER' ? "Supplier's own vehicle" : order.deliveryMode === 'PLATFORM' ? 'BuildX delivery partner' : 'Not dispatched'} />
          {order.cancellationReason ? <Row label="Cancelled" value={`${order.cancellationReason} (${order.inventoryState})`} /> : null}
        </View>

        <View style={s.card}>
          <Party label="Buyer" name={buyer?.name} phone={order.deliveryAddress.contactPhone || buyer?.phone} />
          <Text style={s.address}>{order.deliveryAddress.label} — {order.deliveryAddress.fullAddress}</Text>
          <Party label="Supplier" name={supplier?.businessName} phone={supplier?.whatsappNumber} />
          {driver ? <Party label="Driver" name={driver.name} phone={driver.phone} /> : null}
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Items</Text>
          {order.items.map((item, i) => (
            <Text key={i} style={s.line}>{item.name} — {item.quantity} {item.unit} · {rupees(item.lineTotal ?? item.subtotal)}</Text>
          ))}
          {order.notes ? <Text style={s.muted}>Buyer note: {order.notes}</Text> : null}
        </View>

        {/* Actions */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Actions</Text>
          <TextInput
            style={[s.input, { minHeight: 60 }]}
            value={reason}
            onChangeText={setReason}
            placeholder="Reason / note (saved on the order)"
            placeholderTextColor={Colors.textMuted}
            multiline
          />

          {status === 'READY_FOR_PICKUP' && (
            <Btn label={pickDriver ? 'Hide drivers' : 'Assign a driver…'} onPress={() => setPickDriver((v) => !v)} disabled={busy} />
          )}
          {pickDriver && status === 'READY_FOR_PICKUP' && (
            drivers.isLoading ? <ActivityIndicator color={Colors.primary} /> : (drivers.data?.data ?? [])
              .filter((d) => d.userId?.isActive)
              .map((d) => (
                <TouchableOpacity
                  key={d._id}
                  style={s.driverRow}
                  disabled={busy}
                  onPress={() => assign.mutate(
                    { id: order._id, driverUserId: d.userId!._id, note: reason.trim() || undefined },
                    { ...done(`Assigned to ${d.userId!.name}`), onSettled: () => setPickDriver(false) }
                  )}
                >
                  <Text style={s.line}>{d.isAvailable ? '🟢' : '⚪'} {d.userId!.name} · {d.vehicleType} {d.vehicleNumber}</Text>
                  <Text style={s.muted}>{d.activeOrders} active</Text>
                </TouchableOpacity>
              ))
          )}

          {status === 'ASSIGNED' && <Btn label="Unassign driver (no-show)" onPress={doUnassign} disabled={busy} />}

          {canRecordCod && (
            <View style={{ gap: 8 }}>
              <TextInput
                style={s.input}
                value={codAmount}
                onChangeText={setCodAmount}
                keyboardType="decimal-pad"
                placeholder={`Total cash received (order ${rupees(order.total)})`}
                placeholderTextColor={Colors.textMuted}
              />
              <Btn label="Record cash received" onPress={doRecordCod} disabled={busy} />
            </View>
          )}

          {canCancel && goodsLeftSupplier && (
            <View style={s.toggle}>
              <Text style={s.line}>Goods returned to supplier stock?</Text>
              <Switch value={restock} onValueChange={setRestock} />
            </View>
          )}
          {canCancel && <Btn label="Cancel order" onPress={doCancel} disabled={busy} danger />}
          <Btn label="Add note only" onPress={doNote} disabled={busy || !reason.trim()} secondary />
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>History</Text>
          {order.statusHistory.map((h, i) => (
            <Text key={i} style={s.line}>{when(h.at)} · {h.status} · {h.byRole}{h.note ? ` — ${h.note}` : ''}</Text>
          ))}
          {order.opsNotes.length > 0 && <Text style={[s.cardTitle, { marginTop: 8 }]}>Ops notes</Text>}
          {order.opsNotes.map((n, i) => (
            <Text key={i} style={s.line}>{when(n.at)} · {n.byRole}: {n.note}</Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

function Party({ label, name, phone }: { label: string; name?: string; phone?: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{name ?? '—'}</Text>
      {phone ? (
        <TouchableOpacity onPress={() => Linking.openURL(`tel:${phone}`)}>
          <Text style={s.call}>📞 {phone}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function Btn({ label, onPress, disabled, danger, secondary }: { label: string; onPress: () => void; disabled?: boolean; danger?: boolean; secondary?: boolean }) {
  return (
    <TouchableOpacity
      style={[s.btn, danger && s.btnDanger, secondary && s.btnSecondary, disabled && { opacity: 0.5 }]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[s.btnText, (danger || secondary) && { color: danger ? Colors.error : Colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surfaceAlt },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface,
  },
  back: { padding: 4, marginRight: 8 },
  backIcon: { fontSize: 20, color: Colors.text },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.text },
  status: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  scroll: { padding: 16, gap: 12, paddingBottom: 48 },
  card: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: Colors.text },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  rowLabel: { fontSize: 12, color: Colors.textMuted, width: 70 },
  rowValue: { fontSize: 14, color: Colors.text, fontWeight: '600', flexShrink: 1 },
  call: { fontSize: 13, color: Colors.info, fontWeight: '600' },
  address: { fontSize: 12, color: Colors.textSecondary, marginLeft: 78 },
  line: { fontSize: 13, color: Colors.text },
  muted: { fontSize: 12, color: Colors.textSecondary },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: Colors.text, backgroundColor: Colors.surfaceAlt,
  },
  driverRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  toggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  btn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnDanger: { backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.error },
  btnSecondary: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
