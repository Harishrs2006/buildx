'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useApiClient } from '@buildx/web-core';
import { ProductForm } from '../../../../components/ProductForm';
import { ErrorNote, PageHead } from '../../../../components/ui';
import { isSetupComplete, useSupplierProfile } from '../../../../lib/setup';
import { fetchSupplierProduct, type SupplierProduct } from '../../../../lib/products';

// Listing opens only after business setup: buyers are matched to suppliers by delivery PIN,
// and the brand choices come from the brands the supplier said they deal in.
// ?from=<id> starts from one of the supplier's own listings (same material, brand and price; new size).
function NewProduct() {
  const client = useApiClient();
  const profile = useSupplierProfile();
  const from = useSearchParams().get('from');
  const [template, setTemplate] = useState<{ status: 'none' | 'loading' | 'error' } | { status: 'ready'; product: SupplierProduct }>(
    from ? { status: 'loading' } : { status: 'none' }
  );

  useEffect(() => {
    if (!from) return;
    fetchSupplierProduct(client, from)
      .then((product) => setTemplate({ status: 'ready', product }))
      .catch(() => setTemplate({ status: 'error' }));
  }, [client, from]);

  return (
    <div className="flex flex-col gap-6">
      <PageHead eyebrow="Catalogue" title={template.status === 'ready' ? 'List another size' : 'List a product'}>
        {template.status === 'ready' && (
          <p className="max-w-sm text-[15px] text-stone">Copied from <span className="font-medium text-ink">{template.product.name}</span>. Change the size, price and stock.</p>
        )}
      </PageHead>
      {(profile.status === 'loading' || template.status === 'loading') && <div className="skeleton h-64" role="status" aria-label="Loading" />}
      {profile.status === 'error' && <ErrorNote>Couldn&apos;t load your profile. Check your connection and refresh.</ErrorNote>}
      {template.status === 'error' && <ErrorNote>Couldn&apos;t copy that listing. You can still fill the form from scratch.</ErrorNote>}
      {profile.status === 'success' && !isSetupComplete(profile.profile) && (
        <div className="card flex flex-col items-start gap-4 p-6">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-lime">
            <span className="material-symbols-outlined" aria-hidden="true">storefront</span>
          </span>
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight">Finish your business setup first</h2>
            <p className="mt-1 max-w-xl text-[15px] text-stone">
              Tell us your business type, the PIN codes you deliver to and the brands you deal in. Then you can list products and set stock.
            </p>
          </div>
          <Link href="/setup" className="btn-ink px-6">Go to setup</Link>
        </div>
      )}
      {profile.status === 'success' && isSetupComplete(profile.profile) && template.status !== 'loading' && (
        <ProductForm
          key={template.status === 'ready' ? template.product._id : 'blank'}
          brands={profile.profile.brands ?? []}
          sells={profile.profile.categories ?? []}
          template={template.status === 'ready' ? template.product : undefined}
        />
      )}
    </div>
  );
}

export default function NewProductPage() {
  return (
    <Suspense fallback={<div className="skeleton h-64" />}>
      <NewProduct />
    </Suspense>
  );
}
