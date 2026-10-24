import Link from 'next/link';
import { categoryIcon, type Category } from '@/lib/categories';

export function CategoryGrid({ categories }: { categories: Category[] }) {
  if (categories.length === 0) {
    return (
      <p className="text-on-surface-variant font-body py-12 text-center">
        No categories listed yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
      {categories.map((category) => (
        <Link
          key={category._id}
          href={`/category/${category.slug}`}
          className="group relative bg-surface-container-lowest p-6 rounded-xl transition-all duration-300 hover:bg-primary-container border-l-4 border-primary"
        >
          <div className="flex flex-col h-full justify-between min-h-[160px]">
            <span className="material-symbols-outlined text-4xl text-on-surface group-hover:scale-110 transition-transform">
              {categoryIcon(category.name)}
            </span>
            <h3 className="text-xl font-bold tracking-tight mt-8 font-headline">{category.name}</h3>
          </div>
        </Link>
      ))}
    </div>
  );
}
