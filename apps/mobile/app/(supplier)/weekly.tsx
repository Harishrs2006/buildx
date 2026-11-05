import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../src/lib/api';
import { Colors } from '../../src/constants/colors';
import { Font } from '../../src/constants/typography';
import { Button, Card, EmptyState, Notice, Pill, ScreenHeader } from '../../src/components/ui';

// Weekly availability (API: features/suppliers/weekly.ts). Set this week's quantity and price for every
// item you list, then confirm once. Sthiva reminds you on Monday morning until it is done.

type Item = { _id: string; name: string; unit: string; stockQuantity: number; basePrice: number };
type Weekly = { weekStart: string; confirmedAt: string | null; confirmedThisWeek: boolean; hidden?: boolean; items: Item[] };
type Row = { qty: string; price: string };

const qtyOk = (v: string) => /^\d{1,8}$/.test(v);
const priceOk = (v: string) => /^\d{1,8}(\.\d{1,2})?$/.test(v) && Number(v) > 0;
const rupees = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function WeeklyScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery<{ data: Weekly }>({
    queryKey: ['supplier-weekly'],
    queryFn: () => api.get('/suppliers/me/weekly').then((r) => r.data),
  });
  const week = data?.data;
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (week) setRows(Object.fromEntries(week.items.map((i) => [i._id, { qty: String(i.stockQuantity), price: String(i.basePrice) }])));
  }, [week]);

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.post('/suppliers/me/weekly', {
      items: (week?.items ?? []).map((i) => ({ productId: i._id, stockQuantity: Number(rows[i._id].qty), basePrice: Number(rows[i._id].price) })),
    }).then((r) => r.data),
    onSuccess: () => {
      setNotice({ tone: 'success', text: 'Confirmed for this week. Thank you.' });
      qc.invalidateQueries({ queryKey: ['supplier-weekly'] });
      qc.invalidateQueries({ queryKey: ['supplier-products'] });
    },
    onError: (err: Error) => setNotice({ tone: 'error', text: err.message }),
  });

  const invalid = (week?.items ?? []).filter((i) => !qtyOk(rows[i._id]?.qty ?? '') || !priceOk(rows[i._id]?.price ?? '')).length;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScreenHeader eyebrow="Once a week" title="Weekly check" onBack={() => router.back()} />
      {isLoading ? (
        <ActivityIndicator color={Colors.ink} style={styles.loading} />
      ) : isError || !week ? (
        <View style={styles.pad}>
          <Notice tone="error" title="We could not load your items">Check your connection.</Notice>
          <Button title="Try again" variant="ghost" onPress={() => refetch()} style={styles.gap} />
        </View>
      ) : week.items.length === 0 ? (
        <EmptyState icon="package-variant-closed" title="Nothing listed yet" body="Add the materials you supply first. They show up here every week." />
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.row}>
              {week.confirmedThisWeek
                ? <Pill label="Confirmed this week" bg={Colors.success} color={Colors.sand} />
                : <Pill label="Not confirmed this week" bg={Colors.limeSoft} color={Colors.ink} />}
            </View>
            {week.hidden ? (
              <Notice tone="error" title="Buyers can't see your items right now">
                This week's Monday check was missed. Confirm below and your items come back straight away.
              </Notice>
            ) : null}
            <Text style={styles.body}>
              You can change stock and prices any time. Every Monday, confirm the whole list here before midnight, or buyers stop seeing your items until you do. Quantity 0 shows an item as out of stock.
            </Text>
            {notice ? <Notice tone={notice.tone} onClose={() => setNotice(null)}>{notice.text}</Notice> : null}
            {week.items.map((i) => {
              const r = rows[i._id] ?? { qty: '', price: '' };
              return (
                <Card key={i._id} style={styles.card}>
                  <Text style={styles.name}>{i.name}</Text>
                  <Text style={styles.meta}>Last week: {i.stockQuantity.toLocaleString('en-IN')} {i.unit.toLowerCase()} at {rupees(i.basePrice)}</Text>
                  <View style={styles.inputs}>
                    <View style={styles.flex}>
                      <Text style={styles.label}>Quantity ({i.unit.toLowerCase()})</Text>
                      <TextInput value={r.qty} keyboardType="number-pad" maxLength={8}
                        onChangeText={(v) => setRows({ ...rows, [i._id]: { ...r, qty: v.replace(/\D/g, '') } })}
                        style={[styles.input, !qtyOk(r.qty) && styles.inputBad]} accessibilityLabel={`${i.name}: quantity this week`} />
                    </View>
                    <View style={styles.flex}>
                      <Text style={styles.label}>Price ₹ per {i.unit.toLowerCase()}</Text>
                      <TextInput value={r.price} keyboardType="decimal-pad" maxLength={11}
                        onChangeText={(v) => setRows({ ...rows, [i._id]: { ...r, price: v.replace(/[^\d.]/g, '') } })}
                        style={[styles.input, !priceOk(r.price) && styles.inputBad]} accessibilityLabel={`${i.name}: your price`} />
                    </View>
                  </View>
                </Card>
              );
            })}
          </ScrollView>
          <View style={styles.footer}>
            {invalid > 0 ? <Text style={styles.footerText}>{invalid} item{invalid === 1 ? ' needs' : 's need'} a valid quantity and price</Text> : null}
            <Button title={isPending ? 'Confirming' : 'Confirm this week'} variant="lime" loading={isPending} disabled={invalid > 0} onPress={() => { setNotice(null); mutate(); }} />
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.sand },
  flex: { flex: 1 },
  loading: { marginTop: 60 },
  pad: { padding: 16 },
  gap: { marginTop: 12 },
  scroll: { padding: 12, paddingBottom: 24, gap: 10 },
  row: { flexDirection: 'row' },
  body: { fontFamily: Font.regular, fontSize: 15, lineHeight: 21, color: Colors.ink },
  card: { gap: 6 },
  name: { fontFamily: Font.semiBold, fontSize: 16, color: Colors.ink },
  meta: { fontFamily: Font.regular, fontSize: 13, color: Colors.stone },
  inputs: { flexDirection: 'row', gap: 10, marginTop: 4 },
  label: { fontFamily: Font.medium, fontSize: 12, color: Colors.stone, marginBottom: 4 },
  input: { height: 48, borderRadius: 14, borderWidth: 1, borderColor: Colors.sand4, backgroundColor: Colors.sand2, paddingHorizontal: 12, fontFamily: Font.mono, fontSize: 16, color: Colors.ink },
  inputBad: { borderColor: Colors.error },
  footer: { padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: Colors.sand4, backgroundColor: Colors.sand },
  footerText: { fontFamily: Font.regular, fontSize: 13, color: Colors.error, textAlign: 'center' },
});
