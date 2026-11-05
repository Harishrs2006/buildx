import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Colors } from '../constants/colors';
import { Font } from '../constants/typography';
import { Card, EmptyState, Eyebrow, Notice, Pill, ScreenHeader } from './ui';

// Money between Sthiva and a supplier or driver (API: settlement.service.ts myView). Earnings on
// delivered orders, less buyer cash they collected. Sthiva's team settles and marks statements paid.

type Line = { orderId: string; orderNumber: string; earned: number; cashHeld: number };
type Statement = {
  _id: string; number: string; orders: Line[]; earned: number; cashHeld: number; net: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED'; reference?: string; paidAt?: string; createdAt: string;
};
type View_ = {
  balance: { orders: number; earned: number; cashHeld: number; net: number; waitingForCash: number };
  settlements: Statement[];
};

const rupees = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const date = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const netText = (net: number) => (net > 0 ? `Sthiva pays you ${rupees(net)}` : net < 0 ? `You pay Sthiva ${rupees(-net)}` : 'Nothing due');

function StatementCard({ s }: { s: Statement }) {
  const [open, setOpen] = useState(false);
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        {s.status === 'PAID'
          ? <Pill label="Paid" bg={Colors.success} color={Colors.sand} />
          : <Pill label="Being paid" bg={Colors.limeSoft} color={Colors.ink} />}
        <Text style={styles.mono}>{s.number}</Text>
      </View>
      <Text style={styles.net}>{netText(s.net)}</Text>
      <Text style={styles.meta}>Earned {rupees(s.earned)} · cash you collected {rupees(s.cashHeld)} · {date(s.createdAt)}</Text>
      {s.status === 'PAID' && s.reference ? <Text style={styles.meta}>Reference {s.reference}{s.paidAt ? ` · ${date(s.paidAt)}` : ''}</Text> : null}
      <Pressable onPress={() => setOpen((v) => !v)} accessibilityRole="button" hitSlop={8}>
        <Text style={styles.link}>{open ? 'Hide' : 'Show'} {s.orders.length} order{s.orders.length === 1 ? '' : 's'}</Text>
      </Pressable>
      {open ? s.orders.map((o) => (
        <View key={o.orderId} style={styles.lineRow}>
          <Text style={styles.mono}>{o.orderNumber}</Text>
          <Text style={styles.meta}>{rupees(o.earned)}{o.cashHeld > 0 ? ` · collected ${rupees(o.cashHeld)}` : ''}</Text>
        </View>
      )) : null}
    </Card>
  );
}

export function PayoutsScreen({ path, cashHint }: { path: string; cashHint: string }) {
  const { data, isLoading, isError, refetch, isRefetching } = useQuery<{ data: View_ }>({
    queryKey: ['payouts', path],
    queryFn: () => api.get(path).then((r) => r.data),
    staleTime: 60_000,
  });
  const v = data?.data;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScreenHeader eyebrow="Money" title="Payouts" />
      {isLoading ? (
        <ActivityIndicator color={Colors.ink} style={styles.loading} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.ink} />}
        >
          {isError || !v ? (
            <Notice tone="error" title="We could not load your payouts">Pull down to try again.</Notice>
          ) : (
            <>
              <Card style={styles.card}>
                <Eyebrow>Not settled yet</Eyebrow>
                {v.balance.orders > 0 ? (
                  <>
                    <Text style={styles.big}>{netText(v.balance.net)}</Text>
                    <Text style={styles.meta}>
                      {v.balance.orders} delivered order{v.balance.orders === 1 ? '' : 's'} · earned {rupees(v.balance.earned)} · cash you collected {rupees(v.balance.cashHeld)}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.body}>Nothing waiting right now.</Text>
                )}
                {v.balance.waitingForCash > 0 ? (
                  <Text style={styles.meta}>{v.balance.waitingForCash} delivered order{v.balance.waitingForCash === 1 ? '' : 's'} {cashHint}</Text>
                ) : null}
              </Card>
              <Text style={styles.h2}>Statements</Text>
              {v.settlements.length === 0
                ? <EmptyState icon="receipt" title="No statements yet" body="Sthiva's team sends a statement when it settles your delivered orders." />
                : v.settlements.map((s) => <StatementCard key={s._id} s={s} />)}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.sand },
  loading: { marginTop: 60 },
  scroll: { padding: 12, paddingBottom: 32, gap: 10 },
  card: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: Colors.sand4 },
  big: { fontFamily: Font.display, fontSize: 24, lineHeight: 28, color: Colors.ink, marginTop: 4 },
  net: { fontFamily: Font.bold, fontSize: 17, color: Colors.ink },
  h2: { fontFamily: Font.display, fontSize: 20, color: Colors.ink, marginTop: 10, marginHorizontal: 4 },
  body: { fontFamily: Font.regular, fontSize: 15, color: Colors.ink },
  meta: { fontFamily: Font.regular, fontSize: 13, lineHeight: 18, color: Colors.stone },
  mono: { fontFamily: Font.mono, fontSize: 13, color: Colors.stone },
  link: { fontFamily: Font.semiBold, fontSize: 14, color: Colors.cobalt, marginTop: 2 },
});
