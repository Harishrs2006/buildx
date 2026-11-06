import Image from 'next/image';
import Link from 'next/link';
import { deliveryTimeLabel } from '@sthiva/web-core';
import { PRICE_UNIT_LABEL, type Design } from '@/lib/designs';
import { rupeesWhole } from '@/lib/format';

// A supplier's design: photo first, then name, starting price and how long it usually takes
export function DesignCard({ design, tall = false }: { design: Design; tall?: boolean }) {
  const photo = design.images[0]?.url;
  return (
    <Link href={`/designs/${design._id}`} className="group flex flex-col gap-3">
      <div className={`relative overflow-hidden rounded-2xl bg-sand-3 ${tall ? 'aspect-[4/5]' : 'aspect-[4/3]'}`}>
        {photo && (
          <Image
            src={photo}
            alt={design.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-[1200ms] ease-out-expo group-hover:scale-[1.04]"
          />
        )}
        <span className="absolute left-3 top-3 rounded-full bg-sand/90 px-2.5 py-1 text-[12px] font-semibold text-ink backdrop-blur">{design.style}</span>
        {design.images.length > 1 && (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-ink/70 px-2 py-0.5 text-[12px] text-sand backdrop-blur">
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">photo_library</span>
            {design.images.length}
          </span>
        )}
      </div>
      <div className="flex items-start justify-between gap-3 px-0.5">
        <div className="min-w-0">
          <h3 className="font-display text-[18px] font-semibold leading-tight tracking-[-0.02em] group-hover:underline">{design.title}</h3>
          {design.supplierId?.businessName && <p className="mt-0.5 truncate text-[13px] text-stone">by {design.supplierId.businessName}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[12px] text-stone">from</p>
          <p className="font-display text-[17px] font-bold tabular-nums">
            {rupeesWhole.format(design.priceFrom)}<span className="text-[12px] font-medium text-stone">/{PRICE_UNIT_LABEL[design.priceUnit] ?? 'unit'}</span>
          </p>
        </div>
      </div>
      <p className="-mt-1 flex items-center gap-1 px-0.5 text-[13px] text-stone">
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">schedule</span>
        Usually {deliveryTimeLabel(design.leadDays.min, design.leadDays.max).toLowerCase()}
      </p>
    </Link>
  );
}
