'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useApiClient } from '@buildx/web-core';
import { fetchSupplierProduct, type SupplierProduct } from '../../../../../lib/products';
import { ProductForm } from '../../../../../components/ProductForm';
import { ErrorNote, PageHead } from '../../../../../components/ui';

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const client = useApiClient();
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'success'; product: SupplierProduct } | { status: 'error' }
  >({ status: 'loading' });

  useEffect(() => {
    fetchSupplierProduct(client, id)
      .then((product) => setState({ status: 'success', product }))
      .catch(() => setState({ status: 'error' }));
  }, [client, id]);

  return (
    <div className="flex flex-col gap-6">
      <PageHead eyebrow="Catalogue" title="Edit listing" />
      {state.status === 'loading' && <div className="skeleton h-64" role="status" aria-label="Loading product" />}
      {state.status === 'error' && <ErrorNote>Couldn&apos;t load this product.</ErrorNote>}
      {state.status === 'success' && <ProductForm product={state.product} />}
    </div>
  );
}
