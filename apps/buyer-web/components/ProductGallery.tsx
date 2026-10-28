'use client';

import { useState } from 'react';

export function ProductGallery({ images, badges, name = 'Product' }: { images: { url: string; isPrimary?: boolean }[]; badges?: string[]; name?: string }) {
  const ordered = [...images].sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
  const [active, setActive] = useState(0);
  const main = ordered[active];

  if (!main) {
    return (
      <div className="aspect-[4/3] rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface-variant font-body">
        No image available
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="aspect-[4/3] rounded-xl overflow-hidden bg-surface-container-low relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={main.url} alt={name} className="w-full h-full object-cover" />
        {badges && badges.length > 0 && (
          <div className="absolute top-4 left-4 flex gap-2">
            {badges.map((b) => (
              <span key={b} className="bg-primary text-on-primary px-3 py-1 rounded-md text-xs font-bold font-headline uppercase tracking-wider">
                {b}
              </span>
            ))}
          </div>
        )}
      </div>
      {ordered.length > 1 && (
        <div className="grid grid-cols-4 gap-4">
          {ordered.map((img, i) => (
            <button
              key={img.url + i}
              onClick={() => setActive(i)}
              aria-label={`Show photo ${i + 1}`}
              className={i === active ? 'aspect-square rounded-lg overflow-hidden ring-2 ring-primary' : 'aspect-square rounded-lg overflow-hidden bg-surface-container-low'}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={`${name}, photo ${i + 1}`} className={i === active ? 'w-full h-full object-cover opacity-80' : 'w-full h-full object-cover'} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
