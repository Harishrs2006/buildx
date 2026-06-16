import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMyDeliveries, useUpdateDeliveryStatus, type DeliveryOrder } from '../../../src/hooks/useDelivery';
import { ORDER_STATUS_LABELS } from '../../../src/hooks/useOrders';
import { Colors } from '../../../src/constants/colors';

const NEXT_STATUS: Record<string, { label: string; status: string; color: string } | null> = {
  ASSIGNED:  { label: 'Mark as Picked Up', status: 'PICKED_UP', color: Colors.warning },
  PICKED_UP: { label: 'Mark as In Transit', status: 'IN_TRANSIT', color: Colors.info },
  IN_TRANSIT:{ label: 'Mark as Delivered', status: 'DELIVERED', color: Colors.success },
};

export default function DriverOrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading } = useMyDeliveries();
  const { mutate: updateStatus, isPending } = useUpdateDeliveryStatus();

  const order: DeliveryOrder | undefined = data?.data.find((o) => o._id === id);

  function handleStatusUpdate() {
    if (!order) return;
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    Alert.alert(
      next.label,
      `Update this order to "${ORDER_STATUS_LABELS[next.status as any]}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () =>
            updateStatus({ id: order._id, status: next.status }, {
              onSuccess: () => {
                if (next.status === 'DELIVERED') router.back();
              },
              onError: (err) => Alert.alert('Error', err.message),
            }),
        },
      ]
    );
  }

  function callContact(phone: string) {
    Linking.openURL(`tel:${phone}`);
  }

  if (isLoading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.back}><Text style={s.backIcon}>←</Text></TouchableOpacity>
          <Text style={s.headerTitle}>Order</Text>
        </View>
        <View style={s.center}><Text style={{ color: Colors.textSecondary }}>Order not found.</Text></View>
      </SafeAreaView>
    );
  }

  const supplier = order.supplierId as any;
  const next = NEXT_STATUS[order.status];

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Text style={s.backIcon}>←</Text></TouchableOpacity>
        <Text style={s.headerTitle}>{order.orderNumber}</Text>
        <View style={s.statusBadge}><Text style={s.statusText}>{ORDER_STATUS_LABELS[order.status]}</Text></View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Pickup section */}
        <View style={s.card}>
          <Text style={s.cardLabel}>PICKUP FROM</Text>
          <Text style={s.cardValue}>{supplier?.businessName}</Text>
          {supplier?.whatsappNumber && (
            <TouchableOpacity style={s.callBtn} onPress={() => callContact(supplier.whatsappNumber)}>
              <Text style={s.callBtnText}>📞 Call Supplier</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Drop section */}
        <View style={[s.card, { borderColor: Colors.primary }]}>
          <Text style={[s.cardLabel, { color: Colors.primary }]}>DELIVER TO</Text>
          <Text style={s.cardValue}>{order.deliveryAddress.label} — {order.deliveryAddress.fullAddress}</Text>
          {order.deliveryAddress.contactPhone && (
            <TouchableOpacity style={s.callBtn} onPress={() => callContact(order.deliveryAddress.contactPhone)}>
              <Text style={s.callBtnText}>📞 Call Buyer</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Items */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Items to Deliver</Text>
          {order.items.map((item, i) => (
            <View key={i} style={[s.itemRow, i < order.items.length - 1 && s.itemBorder]}>
              <Text style={s.itemName}>{item.name}</Text>
              <Text style={s.itemQty}>{item.quantity} {item.unit}</Text>
            </View>
          ))}
        </View>

        {/* COD amount */}
        <View style={[s.card, { backgroundColor: Colors.successLight, borderColor: Colors.success }]}>
          <Text style={[s.cardLabel, { color: Colors.success }]}>COLLECT ON DELIVERY (COD)</Text>
          <Text style={s.codAmount}>₹{order.total.toLocaleString('en-IN')}</Text>
          <Text style={s.codNote}>Collect cash from buyer at delivery site</Text>
        </View>

        {order.notes && (
          <View style={s.card}>
            <Text style={s.sectionTitle}>Buyer Notes</Text>
            <Text style={s.notesText}>{order.notes}</Text>
          </View>
        )}

        {/* Timestamps */}
        {(order.assignedAt || order.pickedUpAt) && (
          <View style={s.card}>
            <Text style={s.sectionTitle}>Timeline</Text>
            {order.assignedAt && (
              <Text style={s.tsRow}>Assigned: {new Date(order.assignedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Text>
            )}
            {order.pickedUpAt && (
              <Text style={s.tsRow}>Picked Up: {new Date(order.pickedUpAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Text>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {next && (
        <View style={s.stickyBar}>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: next.color }, isPending && s.actionBtnDisabled]}
            onPress={handleStatusUpdate}
            disabled={isPending}
            activeOpacity={0.85}
          >
            {isPending ? <ActivityIndicator color="#fff" /> : <Text style={s.actionBtnText}>{next.label}</Text>}
          </TouchableOpacity>
        </View>
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
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.text },
  statusBadge: { backgroundColor: Colors.warningLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700', color: Colors.warning },
  scroll: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  cardLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase' },
  cardValue: { fontSize: 15, fontWeight: '600', color: Colors.text, lineHeight: 22 },
  callBtn: { backgroundColor: Colors.infoLight, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, alignSelf: 'flex-start' },
  callBtnText: { fontSize: 14, fontWeight: '600', color: Colors.info },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.text },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  itemName: { fontSize: 14, color: Colors.text, flex: 1 },
  itemQty: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  codAmount: { fontSize: 28, fontWeight: '800', color: Colors.success },
  codNote: { fontSize: 12, color: Colors.success },
  notesText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  tsRow: { fontSize: 13, color: Colors.textSecondary },
  stickyBar: { paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface },
  actionBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
