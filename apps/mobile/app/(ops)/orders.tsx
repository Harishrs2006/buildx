import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../src/constants/colors';
import { useOpsOrders } from '../../src/hooks/useOps';
import { OpsOrderRow } from '../../src/components/OpsOrderRow';

const FILTERS: { key: string; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'CONFIRMED', label: 'New' },
  { key: 'READY_FOR_PICKUP', label: 'Ready' },
  { key: 'ASSIGNED', label: 'Assigned' },
  { key: 'PICKED_UP', label: 'Picked up' },
  { key: 'IN_TRANSIT', label: 'In transit' },
  { key: 'DELIVERED', label: 'Delivered' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

export default function OpsOrdersScreen() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const q = search.trim().replace(/[^A-Za-z0-9-]/g, '');
  const { data, isLoading, refetch, isRefetching, error } = useOpsOrders({ status: status || undefined, q: q || undefined });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>All orders</Text>
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search order number, e.g. BX-M1K2"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="characters"
        />
        <View style={styles.filters}>
          {FILTERS.map((f) => (
            <TouchableOpacity key={f.key} style={[styles.chip, status === f.key && styles.chipActive]} onPress={() => setStatus(f.key)}>
              <Text style={[styles.chipText, status === f.key && styles.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 48 }} />
        ) : (
          <FlatList
            data={data?.data ?? []}
            keyExtractor={(o) => o._id}
            renderItem={({ item }) => <OpsOrderRow order={item} />}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
            ListEmptyComponent={<Text style={styles.empty}>{error ? error.message : 'No orders'}</Text>}
            contentContainerStyle={{ paddingBottom: 32 }}
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
  search: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: Colors.surface, fontSize: 14, color: Colors.text, marginBottom: 10,
  },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 48 },
});
