'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';

export function SearchBar({ placeholder = 'Search products, materials...' }: { placeholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(searchParams.get('search') ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (value.trim()) {
      params.set('search', value.trim());
    } else {
      params.delete('search');
    }
    params.delete('page');
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div className="relative flex items-center">
        {isPending ? (
          <Loader2 className="absolute left-3.5 w-4 h-4 text-muted-foreground animate-spin" />
        ) : (
          <Search className="absolute left-3.5 w-4 h-4 text-muted-foreground" />
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full h-11 pl-10 pr-24 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-shadow"
        />
        <button
          type="submit"
          className="absolute right-1.5 h-8 px-4 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Search
        </button>
      </div>
    </form>
  );
}
