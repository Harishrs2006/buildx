import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Product Categories' };

const CATEGORY_ICONS: Record<string, string> = {
  'cement-concrete': '🏗️', 'steel-iron': '⚙️', 'bricks-blocks': '🧱',
  'sand-aggregates': '⛏️', 'wood-timber': '🪵', 'roofing': '🏠',
  'plumbing': '🔧', 'electrical': '⚡', 'paints-coatings': '🎨', 'glass-glazing': '🪟',
};

async function fetchCategories() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/categories`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch { return []; }
}

export default async function CategoriesPage() {
  const categories = await fetchCategories();

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">All Categories</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Browse construction materials by category
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {categories.map((cat: any) => (
          <Link
            key={cat.id}
            href={`/categories/${cat.slug}`}
            className="group flex flex-col items-center gap-3 p-6 rounded-2xl border border-border bg-card hover:border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all text-center"
          >
            <span className="text-4xl">{CATEGORY_ICONS[cat.slug] ?? '📦'}</span>
            <div>
              <p className="font-semibold text-sm text-foreground group-hover:text-orange-600 transition-colors">
                {cat.name}
              </p>
              {cat.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{cat.description}</p>
              )}
            </div>
          </Link>
        ))}

        {categories.length === 0 &&
          Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-36 rounded-2xl bg-muted animate-pulse" />
          ))}
      </div>
    </div>
  );
}
