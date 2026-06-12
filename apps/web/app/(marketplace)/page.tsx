import Link from 'next/link';
import { ArrowRight, Shield, Zap, BarChart3, Package } from 'lucide-react';
import { SearchBar } from '@/components/features/search/SearchBar';
import { Suspense } from 'react';

const CATEGORIES = [
  { name: 'Cement & Concrete', slug: 'cement-concrete', icon: '🏗️' },
  { name: 'Steel & Iron', slug: 'steel-iron', icon: '⚙️' },
  { name: 'Bricks & Blocks', slug: 'bricks-blocks', icon: '🧱' },
  { name: 'Sand & Aggregates', slug: 'sand-aggregates', icon: '⛏️' },
  { name: 'Wood & Timber', slug: 'wood-timber', icon: '🪵' },
  { name: 'Roofing', slug: 'roofing', icon: '🏠' },
  { name: 'Plumbing', slug: 'plumbing', icon: '🔧' },
  { name: 'Electrical', slug: 'electrical', icon: '⚡' },
];

const STATS = [
  { label: 'Products', value: '10,000+' },
  { label: 'Verified Suppliers', value: '500+' },
  { label: 'Happy Buyers', value: '2,000+' },
  { label: 'Cities Served', value: '50+' },
];

const FEATURES = [
  {
    icon: Shield,
    title: 'Verified Suppliers',
    desc: 'Every supplier is GST-verified and background-checked before listing.',
  },
  {
    icon: Zap,
    title: 'AI Quotations',
    desc: 'Get instant AI-powered price estimates and supplier recommendations.',
  },
  {
    icon: BarChart3,
    title: 'Price Intelligence',
    desc: 'Historical price data and market trends for smarter procurement.',
  },
  {
    icon: Package,
    title: 'Bulk Ordering',
    desc: 'Place bulk orders with custom delivery schedules and credit terms.',
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-900/20 via-transparent to-transparent" />
        <div className="max-w-4xl mx-auto relative space-y-8 text-center">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-full text-orange-400 text-sm font-medium">
            🚀 AI-powered B2B marketplace
          </div>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight">
            Source Construction Materials{' '}
            <span className="text-orange-400">Smarter</span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Connect directly with verified suppliers, get AI-powered quotations, and manage your entire procurement in one place.
          </p>
          <div className="max-w-2xl mx-auto">
            <Suspense>
              <SearchBar placeholder="Search cement, TMT bars, bricks, sand..." />
            </Suspense>
          </div>
          <div className="flex flex-wrap gap-2 justify-center text-sm text-zinc-500">
            <span>Popular:</span>
            {['TMT Bars', 'OPC Cement', 'AAC Blocks', 'River Sand', 'Roofing Sheets'].map((t) => (
              <Link
                key={t}
                href={`/products?search=${encodeURIComponent(t)}`}
                className="hover:text-orange-400 transition-colors"
              >
                {t}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border bg-muted/30 py-10">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-bold text-orange-500">{s.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Shop by Category</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Browse our complete range of construction materials
            </p>
          </div>
          <Link
            href="/categories"
            className="hidden sm:flex items-center gap-1 text-sm text-orange-500 hover:text-orange-600 font-medium"
          >
            All categories <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/categories/${cat.slug}`}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-border bg-card hover:border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all group text-center"
            >
              <span className="text-3xl">{cat.icon}</span>
              <span className="text-xs font-medium text-foreground group-hover:text-orange-600 transition-colors leading-tight">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products CTA */}
      <section className="bg-muted/30 border-y border-border py-16">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Ready to source smarter?</h2>
            <p className="text-muted-foreground mt-1">
              Browse 10,000+ products from verified suppliers across India.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link
              href="/products"
              className="h-11 px-6 inline-flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium transition-colors"
            >
              Browse Products <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/sign-up"
              className="h-11 px-6 inline-flex items-center rounded-xl border border-border hover:bg-muted font-medium transition-colors"
            >
              Get started free
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-foreground text-center mb-10">
          Why procurement teams choose BuildX
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-6 rounded-2xl border border-border bg-card space-y-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Icon className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="font-semibold text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
