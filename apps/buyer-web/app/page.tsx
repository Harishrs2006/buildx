'use client';

import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { CategoryGrid } from '@/components/CategoryGrid';
import { useCategories } from '@/lib/categories';

export default function HomePage() {
  const categories = useCategories();

  return (
    <>
      <Header />
      <main className="pt-24 px-6 max-w-7xl mx-auto">
        <section className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-xl">
            <span className="text-primary font-bold tracking-widest uppercase text-xs mb-2 block font-body">
              Professional Inventory
            </span>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-none mb-4 font-headline">
              SURFACE THE
              <br />
              ESSENTIALS
            </h1>
            <p className="text-on-surface-variant text-lg leading-relaxed border-l-4 border-primary-container pl-6 font-body">
              Direct access to industrial-grade logistics and supply. Browse our specialized
              categories for your project site requirements.
            </p>
          </div>
          <div className="hidden md:block text-right">
            <div className="text-4xl font-bold text-outline-variant opacity-30 font-headline">01 — CATEGORIES</div>
          </div>
        </section>

        {categories.status === 'loading' && (
          <p className="text-on-surface-variant font-body py-12 text-center">Loading categories…</p>
        )}
        {categories.status === 'error' && (
          <p className="text-error font-body py-12 text-center">
            Couldn't load categories right now. Try refreshing the page.
          </p>
        )}
        {categories.status === 'success' && <CategoryGrid categories={categories.data} />}
      </main>
      <BottomNav />
    </>
  );
}
