import Link from 'next/link';
import { categoryIcon, type Category } from '@/lib/categories';
import { Reveal } from './motion/Reveal';

export function CategoryGrid({ categories }: { categories: Category[] }) {
  if (categories.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
        <span className="material-symbols-outlined text-4xl text-stone" aria-hidden="true">inventory_2</span>
        <p className="font-display text-xl font-semibold">No categories listed yet</p>
        <p className="max-w-sm text-[15px] text-stone">Suppliers are still setting up their catalogues. Check back soon.</p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
      {categories.map((category, i) => (
        <Reveal as="li" key={category._id} delay={(i % 4) * 70}>
          <Link
            href={`/category/${category.slug}`}
            className="group relative flex h-full min-h-[184px] flex-col justify-between overflow-hidden rounded-2xl border border-sand-4/80 bg-sand-2 p-5 transition-[transform,box-shadow,border-color] duration-500 ease-out-expo hover:-translate-y-1 hover:border-ink hover:shadow-[0_24px_60px_-28px_rgba(11,12,10,0.45)] sm:p-6"
          >
            <span
              aria-hidden="true"
              className="absolute inset-0 origin-bottom scale-y-0 bg-ink transition-transform duration-500 ease-out-expo group-hover:scale-y-100"
            />
            <div className="relative flex items-start justify-between">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-sand-3 text-ink transition-colors duration-500 group-hover:bg-lime">
                <span className="material-symbols-outlined text-[26px]" aria-hidden="true">{categoryIcon(category.name)}</span>
              </span>
              <span className="font-mono text-[11px] text-stone transition-colors duration-500 group-hover:text-sand/50">
                {String(i + 1).padStart(2, '0')}
              </span>
            </div>
            <div className="relative mt-10 flex items-end justify-between gap-3">
              <h3 className="font-display text-[19px] font-semibold leading-[1.15] tracking-[-0.02em] text-ink transition-colors duration-500 group-hover:text-sand sm:text-[22px]">
                {category.name}
              </h3>
              <span
                className="material-symbols-outlined -translate-x-2 text-[22px] text-lime opacity-0 transition-[opacity,transform] duration-500 ease-out-expo group-hover:translate-x-0 group-hover:opacity-100"
                aria-hidden="true"
              >
                arrow_outward
              </span>
            </div>
          </Link>
        </Reveal>
      ))}
    </ul>
  );
}

export function CategoryGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4" aria-label="Loading categories" role="status">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="skeleton min-h-[184px]" />
      ))}
    </div>
  );
}
