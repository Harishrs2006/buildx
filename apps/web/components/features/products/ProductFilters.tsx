'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { SlidersHorizontal } from 'lucide-react';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price', label: 'Price: Low to High' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'popular', label: 'Most Popular' },
];

export function ProductFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const sortBy = searchParams.get('sortBy') ?? 'newest';
  const minPrice = searchParams.get('minPrice') ?? '';
  const maxPrice = searchParams.get('maxPrice') ?? '';

  const update = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete('page');
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <SlidersHorizontal className="w-4 h-4" />
        <span>Filters:</span>
      </div>

      {/* Sort */}
      <select
        value={sortBy}
        onChange={(e) => update('sortBy', e.target.value)}
        className="h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {/* Price range */}
      <div className="flex items-center gap-2">
        <input
          type="number"
          placeholder="Min ₹"
          value={minPrice}
          onChange={(e) => update('minPrice', e.target.value)}
          className="w-24 h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <span className="text-muted-foreground text-sm">–</span>
        <input
          type="number"
          placeholder="Max ₹"
          value={maxPrice}
          onChange={(e) => update('maxPrice', e.target.value)}
          className="w-24 h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>
    </div>
  );
}
