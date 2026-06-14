import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../../src/constants/colors';
import { useUpdateProduct, useSupplierProducts } from '../../../src/hooks/useSupplier';

const GST_RATES = [5, 12, 18, 28];
const PRODUCT_STATUSES = ['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK'];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function Input(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput style={styles.input} placeholderTextColor={Colors.textMuted} {...props} />;
}

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useSupplierProducts();
  const { mutate: updateProduct, isPending } = useUpdateProduct();

  const product = data?.data?.find((p) => p._id === id);

  const [form, setForm] = useState({
    name: '',
    description: '',
    basePrice: '',
    stockQuantity: '',
    minOrderQuantity: '1',
    deliveryDays: '2',
    gstRate: 18,
    status: 'ACTIVE',
    tags: '',
  });

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        description: '',
        basePrice: String(product.basePrice),
        stockQuantity: String(product.stockQuantity),
        minOrderQuantity: '1',
        deliveryDays: '2',
        gstRate: product.gstRate,
        status: product.status,
        tags: '',
      });
    }
  }, [product]);

  function set(key: string, value: string | number) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit() {
    if (!id) return;
    if (!form.name.trim()) { Alert.alert('Error', 'Product name is required'); return; }
    if (!form.basePrice || isNaN(Number(form.basePrice))) { Alert.alert('Error', 'Enter a valid price'); return; }

    updateProduct({
      id,
      data: {
        name: form.name.trim(),
        basePrice: Number(form.basePrice),
        stockQuantity: Number(form.stockQuantity) || 0,
        gstRate: form.gstRate,
        status: form.status,
      },
    }, {
      onSuccess: () => {
        Alert.alert('Updated', 'Product updated successfully.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      },
      onError: (err) => Alert.alert('Error', err.message || 'Failed to update product'),
    });
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 48 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.back}>{'<'} Back</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Edit Product</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Field label="Product Name *">
          <Input value={form.name} onChangeText={(v) => set('name', v)} />
        </Field>

        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Field label="Base Price (Rs) *">
              <Input value={form.basePrice} onChangeText={(v) => set('basePrice', v)} keyboardType="decimal-pad" />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Stock Qty">
              <Input value={form.stockQuantity} onChangeText={(v) => set('stockQuantity', v)} keyboardType="number-pad" />
            </Field>
          </View>
        </View>

        <Field label="GST Rate">
          <View style={styles.chipRow}>
            {GST_RATES.map((rate) => (
              <TouchableOpacity key={rate} style={[styles.chip, form.gstRate === rate && styles.chipActive]} onPress={() => set('gstRate', rate)}>
                <Text style={[styles.chipText, form.gstRate === rate && styles.chipTextActive]}>{rate}%</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        <Field label="Status">
          <View style={styles.chipRow}>
            {PRODUCT_STATUSES.map((s) => (
              <TouchableOpacity key={s} style={[styles.chip, form.status === s && styles.chipActive]} onPress={() => set('status', s)}>
                <Text style={[styles.chipText, form.status === s && styles.chipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        <TouchableOpacity style={[styles.submitBtn, isPending && { opacity: 0.6 }]} onPress={handleSubmit} disabled={isPending}>
          {isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Save Changes</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { fontSize: 15, color: Colors.primary, fontWeight: '600' },
  topTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  content: { padding: 20, paddingBottom: 48 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: Colors.text, backgroundColor: '#fff' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },
  row2: { flexDirection: 'row', gap: 12 },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
