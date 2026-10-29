'use client';

import Link from 'next/link';
import { ProductForm } from '../../../../components/ProductForm';
import { ErrorNote, PageHead } from '../../../../components/ui';
import { isSetupComplete, useSupplierProfile } from '../../../../lib/setup';

// Listing opens only after business setup: buyers are matched to suppliers by delivery PIN,
// and the brand choices come from the brands the supplier said they deal in.
export default function NewProductPage() {
  const profile = useSupplierProfile();

  return (
    <div className="flex flex-col gap-6">
      <PageHead eyebrow="Catalogue" title="List a product" />
      {profile.status === 'loading' && <div className="skeleton h-64" role="status" aria-label="Loading your profile" />}
      {profile.status === 'error' && <ErrorNote>Couldn&apos;t load your profile. Check your connection and refresh.</ErrorNote>}
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
      {profile.status === 'success' && isSetupComplete(profile.profile) && <ProductForm brands={profile.profile.brands ?? []} />}
    </div>
  );
}
