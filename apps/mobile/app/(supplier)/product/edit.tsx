import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../../src/constants/colors';
import { useSupplierProduct, useUpdateProduct } from '../../../src/hooks/useSupplier';
import { Button, EmptyState, ScreenHeader } from '../../../src/components/ui';
import { ProductForm, toPayload, type ProductFormValues } from '../../../src/components/ProductForm';

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, refetch } = useSupplierProduct(id);
  const { mutate: updateProduct, isPending } = useUpdateProduct();
  const [error, setError] = useState<string | null>(null);
  const product = data?.data;

  if (isLoading) {
    return <View style={styles.loading}><ActivityIndicator color={Colors.ink} /></View>;
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Edit product" onBack={() => router.back()} />
        <EmptyState
          icon="package-variant-remove"
          title="We could not load this product"
          action={<Button title="Try again" variant="ghost" onPress={() => refetch()} />}
        />
      </SafeAreaView>
    );
  }

  const initial: ProductFormValues = {
    name: product.name,
    categoryId: product.categoryId?._id ?? '',
    description: product.description ?? '',
    shortDescription: product.shortDescription ?? '',
    unit: product.unit,
    basePrice: String(product.basePrice),
    gstRate: product.gstRate,
    isGstInclusive: product.isGstInclusive ?? true,
    stockQuantity: String(product.stockQuantity),
    minOrderQuantity: String(product.minOrderQuantity ?? 1),
    deliveryDays: String(product.deliveryDays ?? 2),
    tags: (product.tags ?? []).join(', '),
  };

  return (
    <ProductForm
      eyebrow={product.categoryId?.name ?? 'Product'}
      title="Edit product"
      initial={initial}
      onBack={() => router.back()}
      saving={isPending}
      error={error}
      submitLabel="Save changes"
      onSubmit={(values) => {
        setError(null);
        updateProduct(
          { id: product._id, data: toPayload(values) },
          {
            onSuccess: () => router.back(),
            onError: (err) => setError(err.message || 'We could not save your changes. Please try again.'),
          }
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.sand },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.sand },
});
