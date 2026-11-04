import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../src/constants/colors';
import { Font } from '../../src/constants/typography';
import { useOpsSuppliers, useOpsVerifySupplier, type OpsSupplier } from '../../src/hooks/useOps';
import { ConfirmSheet, EmptyState, Icon, Notice, type } from '../../src/components/ui';

const TABS = [
  { key: 'PENDING', label: 'Waiting' },
  { key: 'VERIFIED', label: 'Verified' },
  { key: 'REJECTED', label: 'Rejected' },
];

export default function OpsSuppliersScreen() {
  const [tab, setTab] = useState('PENDING');
  const { data, isLoading, refetch, isRefetching } = useOpsSuppliers(tab);
  const verify = useOpsVerifySupplier();
  const [deciding, setDeciding] = useState<{ supplier: OpsSupplier; status: 'VERIFIED' | 'REJECTED' } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    if (!deciding) return;
    const { supplier, status } = deciding;
    setError(null);
    verify.mutate({ id: supplier._id, status }, {
      onSuccess: () => setDeciding(null),
      onError: (e) => { setDeciding(null); setError(`${supplier.businessName}: ${e.message}`); },
    });
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <Text style={[type.title, styles.title]}>Suppliers</Text>
      <View style={styles.tabs}>
        {TABS.map((t) => {
          const on = tab === t.key;
          return (
            <Pressable key={t.key} style={[styles.tab, on && styles.tabOn]} onPress={() => setTab(t.key)} accessibilityRole="tab" accessibilityState={{ selected: on }}>
              <Text style={[styles.tabText, on && styles.tabTextOn]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Notice tone="error" onClose={() => setError(null)} style={styles.notice}>{error}</Notice> : null}

      {isLoading ? (
        <ActivityIndicator color={Colors.ink} style={styles.loading} />
      ) : (
        <FlatList
          data={data?.data ?? []}
          keyExtractor={(sp) => sp._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.ink} />}
          ListEmptyComponent={<EmptyState icon="storefront-outline" title="Nobody here" body={`No ${TABS.find((t) => t.key === tab)?.label.toLowerCase()} suppliers.`} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>{item.businessName}</Text>
              <Text style={styles.sub}>{item.userId?.name} · {item.serviceAreas.join(', ') || 'No service areas yet'}</Text>
              {item.whatsappNumber ? (
                <Pressable style={styles.call} onPress={() => Linking.openURL(`tel:${item.whatsappNumber}`)} accessibilityRole="button">
                  <Icon name="phone-outline" size={16} />
                  <Text style={styles.callText}>{item.whatsappNumber}</Text>
                </Pressable>
              ) : null}
              {item.verificationStatus !== 'VERIFIED' ? (
                <View style={styles.actions}>
                  <Pressable style={[styles.btn, styles.btnOk]} onPress={() => setDeciding({ supplier: item, status: 'VERIFIED' })} accessibilityRole="button">
                    <Text style={styles.btnText}>Verify</Text>
                  </Pressable>
                  {item.verificationStatus === 'PENDING' ? (
                    <Pressable style={[styles.btn, styles.btnNo]} onPress={() => setDeciding({ supplier: item, status: 'REJECTED' })} accessibilityRole="button">
                      <Text style={[styles.btnText, styles.btnNoText]}>Reject</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          )}
        />
      )}

      <ConfirmSheet
        visible={!!deciding}
        title={deciding ? `${deciding.status === 'VERIFIED' ? 'Verify' : 'Reject'} ${deciding.supplier.businessName}?` : ''}
        body={deciding?.status === 'VERIFIED' ? 'Buyers will see the Verified badge on their products.' : 'The supplier will be told to contact Sthiva support.'}
        confirmLabel={deciding?.status === 'VERIFIED' ? 'Verify' : 'Reject'}
        danger={deciding?.status === 'REJECTED'}
        loading={verify.isPending}
        onConfirm={confirm}
        onCancel={() => setDeciding(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.sand },
  title: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 12 },
  tab: { height: 38, paddingHorizontal: 16, borderRadius: 19, borderWidth: 1, borderColor: Colors.sand4, backgroundColor: Colors.sand2, justifyContent: 'center' },
  tabOn: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  tabText: { fontFamily: Font.semiBold, fontSize: 14, color: Colors.ink },
  tabTextOn: { color: Colors.sand },
  notice: { marginHorizontal: 20, marginBottom: 10 },
  loading: { marginTop: 48 },
  list: { paddingHorizontal: 20, paddingBottom: 32, gap: 10 },
  card: { padding: 16, borderRadius: 18, backgroundColor: Colors.sand2, borderWidth: 1, borderColor: Colors.sand4 },
  name: { fontFamily: Font.bold, fontSize: 16, color: Colors.ink },
  sub: { fontFamily: Font.regular, fontSize: 13, color: Colors.stone, marginTop: 4 },
  call: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, alignSelf: 'flex-start' },
  callText: { fontFamily: Font.semiBold, fontSize: 14, color: Colors.ink, textDecorationLine: 'underline' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btn: { flex: 1, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  btnOk: { backgroundColor: Colors.lime },
  btnNo: { backgroundColor: Colors.errorLight },
  btnText: { fontFamily: Font.bold, fontSize: 15, color: Colors.ink },
  btnNoText: { color: Colors.error },
});
