'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useApiClient } from '@buildx/web-core';
import { fetchSupplierProduct, type SupplierProduct } from '../../../../../lib/products';
import { ProductForm } from '../../../../../components/ProductForm';

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
      <h1 className="font-headline text-2xl font-bold text-on-surface">Edit product</h1>
      {state.status === 'loading' && <p className="font-body text-sm text-on-surface-variant">Loading…</p>}
      {state.status === 'error' && <p className="font-body text-sm text-error">Couldn't load this product.</p>}
      {state.status === 'success' && <ProductForm product={state.product} />}
    </div>
  );
}
