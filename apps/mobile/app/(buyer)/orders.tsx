import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useOrders, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, type Order } from '../../src/hooks/useOrders';
import { Colors } from '../../src/constants/colors';
import { Font } from '../../src/constants/typography';
import { Button, EmptyState, Eyebrow, Icon, Notice, Pill, type } from '../../src/components/ui';

function OrderCard({ order }: { order: Order }) {
  const router = useRouter();
  const statusColor = ORDER_STATUS_COLORS[order.status];
  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
  const date = new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push({ pathname: '/(buyer)/order/[id]', params: { id: order._id } } as never)}
      accessibilityRole="button"
      accessibilityLabel={`Order ${order.orderNumber}, ${ORDER_STATUS_LABELS[order.status]}`}
    >
      <View style={styles.cardTop}>
        <View>
          <Text style={styles.orderNum}>{order.orderNumber}</Text>
          <Text style={styles.orderDate}>{date}</Text>
        </View>
        <Pill label={ORDER_STATUS_LABELS[order.status]} bg={statusColor.bg} color={statusColor.text} />
      </View>
      <Text style={styles.items} numberOfLines={2}>{order.items.map((i) => i.name).join(', ')}</Text>
      <View style={styles.cardBottom}>
        <Text style={styles.itemCount}>{itemCount} item{itemCount !== 1 ? 's' : ''}</Text>
        <View style={styles.totalWrap}>
          <Text style={styles.total}>₹{order.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
          <Icon name="chevron-right" size={20} color={Colors.stone} />
        </View>
      </View>
    </Pressable>
  );
}

export default function OrdersScreen() {
  const router = useRouter();
  const { data, isLoading, isError, isRefetching, refetch } = useOrders();
  const orders: Order[] = data?.data ?? [];
  const active = orders.filter((o) => !['DELIVERED', 'CANCELLED'].includes(o.status)).length;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.header}>
        <Eyebrow>{active > 0 ? `${active} in progress` : 'Your orders'}</Eyebrow>
        <Text style={[type.title, styles.title]}>Orders</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.ink} style={styles.loading} />
      ) : isError ? (
        <Notice tone="error" title="We could not load your orders" style={styles.notice}>
          <Pressable onPress={() => refetch()} hitSlop={8} accessibilityRole="button">
            <Text style={styles.link}>Try again</Text>
          </Pressable>
        </Notice>
      ) : orders.length === 0 ? (
        <EmptyState
          icon="clipboard-text-outline"
          title="No orders yet"
          body="When you place an order, you can follow every step here."
          action={<Button title="Browse materials" onPress={() => router.replace('/(buyer)/home' as never)} />}
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <OrderCard order={item} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.ink} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.sand },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title: { marginTop: 6 },
  loading: { marginTop: 40 },
  notice: { marginHorizontal: 20, marginTop: 12 },
  link: { fontFamily: Font.bold, fontSize: 14, color: Colors.ink, textDecorationLine: 'underline', marginTop: 4 },
  list: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 10 },
  card: { padding: 16, borderRadius: 18, backgroundColor: Colors.sand2, borderWidth: 1, borderColor: Colors.sand4 },
  cardPressed: { borderColor: Colors.ink, transform: [{ scale: 0.99 }] },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  orderNum: { fontFamily: Font.monoBold, fontSize: 14, letterSpacing: 0.5, color: Colors.ink },
  orderDate: { fontFamily: Font.regular, fontSize: 13, color: Colors.stone, marginTop: 2 },
  items: { fontFamily: Font.medium, fontSize: 15, lineHeight: 20, color: Colors.ink, marginTop: 12 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.sand4 },
  itemCount: { fontFamily: Font.regular, fontSize: 13, color: Colors.stone },
  totalWrap: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  total: { fontFamily: Font.display, fontSize: 18, color: Colors.ink },
});
