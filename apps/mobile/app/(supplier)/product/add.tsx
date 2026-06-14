import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { router } from 'expo-router';
import { Colors } from '../../../src/constants/colors';
import { useCreateProduct } from '../../../src/hooks/useSupplier';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../src/lib/api';

const UNITS = ['KG', 'TON', 'PIECE', 'BAG', 'BUNDLE', 'CUBIC_METER', 'SQUARE_METER', 'LITER', 'METER'];
const GST_RATES = [5, 12, 18, 28];

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}{required ? ' *' : ''}</Text>
      {children}
    </View>
  );
}

function Input(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput style={styles.input} placeholderTextColor={Colors.textMuted} {...props} />;
}

export default function AddProductScreen() {
  const { mutate: createProduct, isPending } = useCreateProduct();
  const { data: categoriesData } = useQuery<{ data: { _id: string; name: string }[] }>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data),
    staleTime: 300_000,
  });

  const [form, setForm] = useState({
    name: '',
    categoryId: '',
    description: '',
    shortDescription: '',
    unit: 'PIECE',
    basePrice: '',
    gstRate: 18,
    isGstInclusive: true,
    stockQuantity: '',
    minOrderQuantity: '1',
    deliveryDays: '2',
    tags: '',
  });

  const categories = categoriesData?.data ?? [];

  function set(key: string, value: string | number | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit() {
    if (!form.name.trim()) { Alert.alert('Error', 'Product name is required'); return; }
    if (!form.categoryId) { Alert.alert('Error', 'Select a category'); return; }
    if (!form.description.trim()) { Alert.alert('Error', 'Description is required'); return; }
    if (!form.basePrice || isNaN(Number(form.basePrice))) { Alert.alert('Error', 'Enter a valid price'); return; }

    createProduct({
      name: form.name.trim(),
      categoryId: form.categoryId,
      description: form.description.trim(),
      shortDescription: form.shortDescription.trim() || undefined,
      unit: form.unit,
      basePrice: Number(form.basePrice),
      gstRate: form.gstRate,
      isGstInclusive: form.isGstInclusive,
      stockQuantity: Number(form.stockQuantity) || 0,
      minOrderQuantity: Number(form.minOrderQuantity) || 1,
      deliveryDays: Number(form.deliveryDays) || 2,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    }, {
      onSuccess: () => {
        Alert.alert('Product Added!', 'Your product is now live on BuildX.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      },
      onError: (err) => Alert.alert('Error', err.message || 'Failed to add product'),
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.back}>{'<'} Back</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Add Product</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Field label="Product Name" required>
          <Input value={form.name} onChangeText={(v) => set('name', v)} placeholder="e.g. 53 Grade OPC Cement" />
        </Field>

        <Field label="Category" required>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={[styles.chipRow, { marginTop: 0 }]}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat._id}
                  style={[styles.chip, form.categoryId === cat._id && styles.chipActive]}
                  onPress={() => set('categoryId', cat._id)}
                >
                  <Text style={[styles.chipText, form.categoryId === cat._id && styles.chipTextActive]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </Field>

        <Field label="Description" required>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={form.description}
            onChangeText={(v) => set('description', v)}
            placeholder="Describe product — grade, brand, usage..."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={4}
          />
        </Field>

        <Field label="Short Description">
          <Input value={form.shortDescription} onChangeText={(v) => set('shortDescription', v)} placeholder="One-line summary (optional)" />
        </Field>

        <Field label="Unit" required>
          <View style={styles.chipRow}>
            {UNITS.map((u) => (
              <TouchableOpacity key={u} style={[styles.chip, form.unit === u && styles.chipActive]} onPress={() => set('unit', u)}>
                <Text style={[styles.chipText, form.unit === u && styles.chipTextActive]}>{u}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Field label="Base Price (Rs)" required>
              <Input value={form.basePrice} onChangeText={(v) => set('basePrice', v)} placeholder="0.00" keyboardType="decimal-pad" />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Stock Qty">
              <Input value={form.stockQuantity} onChangeText={(v) => set('stockQuantity', v)} placeholder="0" keyboardType="number-pad" />
            </Field>
          </View>
        </View>

        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Field label="Min Order Qty">
              <Input value={form.minOrderQuantity} onChangeText={(v) => set('minOrderQuantity', v)} keyboardType="number-pad" />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Delivery Days">
              <Input value={form.deliveryDays} onChangeText={(v) => set('deliveryDays', v)} keyboardType="number-pad" />
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

        <Field label="GST Inclusive?">
          <View style={styles.chipRow}>
            <TouchableOpacity style={[styles.chip, form.isGstInclusive && styles.chipActive]} onPress={() => set('isGstInclusive', true)}>
              <Text style={[styles.chipText, form.isGstInclusive && styles.chipTextActive]}>Inclusive</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.chip, !form.isGstInclusive && styles.chipActive]} onPress={() => set('isGstInclusive', false)}>
              <Text style={[styles.chipText, !form.isGstInclusive && styles.chipTextActive]}>Exclusive</Text>
            </TouchableOpacity>
          </View>
        </Field>

        <Field label="Tags (comma separated)">
          <Input value={form.tags} onChangeText={(v) => set('tags', v)} placeholder="cement, opc, construction" />
        </Field>

        <TouchableOpacity style={[styles.submitBtn, isPending && { opacity: 0.6 }]} onPress={handleSubmit} disabled={isPending}>
          {isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Add Product</Text>}
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
  textarea: { height: 100, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },
  row2: { flexDirection: 'row', gap: 12 },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
