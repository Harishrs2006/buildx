import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../src/lib/api';
import { Colors } from '../../../src/constants/colors';
import { useCreateProduct } from '../../../src/hooks/useSupplier';
import { Notice } from '../../../src/components/ui';
import { ProductForm, emptyProduct, toPayload } from '../../../src/components/ProductForm';

export default function AddProductScreen() {
  const { mutate: createProduct, isPending } = useCreateProduct();
  const [error, setError] = useState<string | null>(null);
  const { data: categoriesData, isLoading } = useQuery<{ data: { _id: string; name: string }[] }>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data),
    staleTime: 300_000,
  });

  if (isLoading) {
    return <View style={styles.loading}><ActivityIndicator color={Colors.ink} /></View>;
  }

  return (
    <ProductForm
      eyebrow="New listing"
      title="List a product"
      initial={emptyProduct}
      categories={categoriesData?.data ?? []}
      onBack={() => router.back()}
      saving={isPending}
      error={error}
      submitLabel="Publish"
      draftLabel="Save draft"
      footer={
        <Notice tone="info">Add photos and bulk prices from the seller website. They show here once saved.</Notice>
      }
      onSubmit={(values, asDraft) => {
        setError(null);
        createProduct(
          { ...toPayload(values), categoryId: values.categoryId, status: asDraft ? 'DRAFT' : 'ACTIVE' },
          {
            // The products list shows the new listing (live, out of stock or draft)
            onSuccess: () => router.replace('/(supplier)/products'),
            onError: (err) => setError(err.message || 'We could not save the product. Please try again.'),
          }
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.sand },
});
