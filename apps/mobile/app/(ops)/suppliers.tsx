import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../src/constants/colors';
import { useOpsSuppliers, useOpsVerifySupplier, type OpsSupplier } from '../../src/hooks/useOps';

const TABS = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'VERIFIED', label: 'Verified' },
  { key: 'REJECTED', label: 'Rejected' },
];

export default function OpsSuppliersScreen() {
  const [tab, setTab] = useState('PENDING');
  const { data, isLoading, refetch, isRefetching } = useOpsSuppliers(tab);
  const verify = useOpsVerifySupplier();

  function decide(supplier: OpsSupplier, status: 'VERIFIED' | 'REJECTED') {
    const verb = status === 'VERIFIED' ? 'Verify' : 'Reject';
    Alert.alert(`${verb} ${supplier.businessName}?`, status === 'VERIFIED'
      ? 'Buyers will see the Verified badge on their products.'
      : 'The supplier will be told to contact BuildX support.', [
      { text: 'Back', style: 'cancel' },
      {
        text: verb,
        style: status === 'REJECTED' ? 'destructive' : 'default',
        onPress: () => verify.mutate({ id: supplier._id, status }, { onError: (e) => Alert.alert('Failed', e.message) }),
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Suppliers</Text>
        <View style={styles.tabs}>
          {TABS.map((t) => (
            <TouchableOpacity key={t.key} style={[styles.chip, tab === t.key && styles.chipActive]} onPress={() => setTab(t.key)}>
              <Text style={[styles.chipText, tab === t.key && styles.chipTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 48 }} />
        ) : (
          <FlatList
            data={data?.data ?? []}
            keyExtractor={(sp) => sp._id}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
            ListEmptyComponent={<Text style={styles.empty}>No {tab.toLowerCase()} suppliers</Text>}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.name}>{item.businessName}</Text>
                <Text style={styles.sub}>{item.userId?.name} · {item.serviceAreas.join(', ') || 'No service areas'}</Text>
                <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.whatsappNumber}`)}>
                  <Text style={styles.call}>📞 {item.whatsappNumber}</Text>
                </TouchableOpacity>
                {item.verificationStatus !== 'VERIFIED' && (
                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.btn} onPress={() => decide(item, 'VERIFIED')} disabled={verify.isPending}>
                      <Text style={styles.btnText}>Verify</Text>
                    </TouchableOpacity>
                    {item.verificationStatus === 'PENDING' && (
                      <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={() => decide(item, 'REJECTED')} disabled={verify.isPending}>
                        <Text style={[styles.btnText, { color: Colors.error }]}>Reject</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surfaceAlt },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  tabs: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },
  card: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border, gap: 4 },
  name: { fontSize: 15, fontWeight: '700', color: Colors.text },
  sub: { fontSize: 12, color: Colors.textSecondary },
  call: { fontSize: 13, color: Colors.info, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btn: { flex: 1, backgroundColor: Colors.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  btnDanger: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.error },
  btnText: { color: '#fff', fontWeight: '700' },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 48 },
});
