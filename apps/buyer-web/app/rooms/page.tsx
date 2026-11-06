import type { Metadata } from 'next';
import Link from 'next/link';
import { ROOMS } from '@sthiva/web-core';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { RoomCard } from '@/components/rooms/RoomCard';

export const metadata: Metadata = {
  title: 'Shop by room',
  description: 'Everything that goes into a kitchen, bathroom, bedroom, living room, pooja room or terrace, from verified suppliers near your site.',
  alternates: { canonical: '/rooms' },
};

export default function RoomsPage() {
  const [first, second, ...rest] = ROOMS;
  return (
    <>
      <Header />
      <main id="main" className="pb-24">
        <section className="container-x pt-[calc(var(--header-h)+40px)]">
          <nav aria-label="Breadcrumb" className="text-[13px] text-stone">
            <Link href="/" className="hover:text-ink">Home</Link> <span aria-hidden="true">/</span> Rooms
          </nav>
          <div className="mt-6 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <h1 className="max-w-3xl font-display text-[clamp(2.75rem,7vw,5.5rem)] font-bold leading-[0.92] tracking-tightest">
              Shop by <span className="font-serif font-normal italic">room.</span>
            </h1>
            <p className="max-w-sm text-[15px] leading-relaxed text-stone">
              Pick a room and see everything that goes into it, from the pipes behind the wall to the finish you see.
            </p>
          </div>
        </section>

        <section className="container-x mt-10 grid gap-4 lg:grid-cols-2" aria-label="Rooms">
          <RoomCard room={first} size="lg" priority />
          <RoomCard room={second} size="lg" priority />
        </section>
        <section className="container-x mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="More rooms">
          {rest.map((r) => (
            <RoomCard key={r.slug} room={r} />
          ))}
        </section>
      </main>
      <SiteFooter />
      <BottomNav />
    </>
  );
}
