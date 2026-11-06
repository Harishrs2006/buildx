import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ROOMS, room as findRoom, roomSections } from '@sthiva/web-core';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { MaterialCard } from '@/components/catalog/MaterialCard';
import { RoomCard } from '@/components/rooms/RoomCard';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return ROOMS.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = findRoom((await params).slug);
  if (!r) return { title: 'Room' };
  return {
    title: `${r.name}: materials and fittings`,
    description: `${r.tagline} From verified suppliers that deliver to your PIN code.`,
    alternates: { canonical: `/rooms/${r.slug}` },
  };
}

const anchor = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export default async function RoomPage({ params }: Props) {
  const r = findRoom((await params).slug);
  if (!r) notFound();
  const sections = roomSections(r).filter((s) => s.items.length > 0);
  const others = ROOMS.filter((x) => x.slug !== r.slug);

  return (
    <>
      <Header tone="dark" darkUntilId="room-hero" />
      <main id="main" className="pb-24">
        <section id="room-hero" className="on-ink relative isolate overflow-hidden bg-ink text-sand">
          <Image src={r.photo} alt="" fill priority sizes="100vw" className="-z-10 object-cover opacity-70" />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(11,12,10,0.86)_0%,rgba(11,12,10,0.5)_55%,rgba(11,12,10,0.15)_100%)]" aria-hidden="true" />
          <div className="container-x pb-12 pt-[calc(var(--header-h)+48px)] md:pb-20 md:pt-[calc(var(--header-h)+80px)]">
            <nav aria-label="Breadcrumb" className="mb-6 text-[13px] text-sand/60">
              <Link href="/" className="hover:text-sand">Home</Link> <span aria-hidden="true">/</span>{' '}
              <Link href="/rooms" className="hover:text-sand">Rooms</Link>
            </nav>
            <h1 className="max-w-3xl font-display text-[clamp(2.75rem,7vw,5.5rem)] font-bold leading-[0.92] tracking-tightest">{r.name}</h1>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-sand/80">{r.tagline}</p>
            <ul className="mt-8 flex flex-wrap gap-2" aria-label="Sections">
              {sections.map((s) => (
                <li key={s.title}>
                  <a href={`#${anchor(s.title)}`} className="inline-flex rounded-full border border-white/20 bg-white/[0.06] px-4 py-2 text-[13px] font-medium text-sand backdrop-blur transition-colors hover:border-lime hover:text-lime">
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* room switcher */}
        <nav aria-label="Other rooms" className="border-b border-ink/[0.07] bg-sand-2">
          <ul className="container-x flex gap-2 overflow-x-auto py-3">
            {ROOMS.map((x) => {
              const active = x.slug === r.slug;
              return (
                <li key={x.slug} className="shrink-0">
                  <Link
                    href={`/rooms/${x.slug}`}
                    aria-current={active ? 'page' : undefined}
                    className={`inline-flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-[14px] font-medium transition-colors ${
                      active ? 'bg-ink text-sand' : 'border border-sand-4 bg-sand hover:border-ink'
                    }`}
                  >
                    <span className="relative h-7 w-7 overflow-hidden rounded-full bg-sand-3">
                      <Image src={x.photo} alt="" fill sizes="28px" className="object-cover" />
                    </span>
                    {x.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="container-x flex flex-col gap-14 pt-12 md:gap-20 md:pt-16">
          {sections.map((s, i) => (
            <section key={s.title} id={anchor(s.title)} className="scroll-mt-28" aria-labelledby={`${anchor(s.title)}-title`}>
              <div className="flex items-baseline justify-between gap-4 border-b border-ink/10 pb-4">
                <h2 id={`${anchor(s.title)}-title`} className="font-display text-[clamp(1.6rem,3vw,2.25rem)] font-bold leading-tight tracking-tightest">
                  <span className="mr-3 font-mono text-[13px] font-medium tracking-normal text-stone">{String(i + 1).padStart(2, '0')}</span>
                  {s.title}
                </h2>
                <p className="shrink-0 text-[13px] text-stone">{s.items.length} {s.items.length === 1 ? 'type' : 'types'}</p>
              </div>
              <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {s.items.map((item) => (
                  <li key={item.id}>
                    <MaterialCard item={item} />
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <p className="flex items-start gap-3 rounded-2xl bg-sand-2 px-5 py-4 text-[14px] text-stone">
            <span className="material-symbols-outlined mt-0.5 text-[20px] text-ink" aria-hidden="true">info</span>
            Open a material to see live offers from verified suppliers that deliver to your PIN code, with their prices and usual delivery time.
          </p>

          <section aria-labelledby="more-rooms">
            <h2 id="more-rooms" className="font-display text-[clamp(1.6rem,3vw,2.25rem)] font-bold tracking-tightest">More rooms</h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {others.slice(0, 3).map((x) => (
                <li key={x.slug}>
                  <RoomCard room={x} />
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
      <SiteFooter />
      <BottomNav />
    </>
  );
}
