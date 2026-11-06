import Image from 'next/image';
import Link from 'next/link';
import type { Room } from '@sthiva/web-core';

// A room as a large photo card: name and a one-line promise over the image, item count, arrow
export function RoomCard({ room, size = 'md', priority = false }: { room: Room; size?: 'md' | 'lg'; priority?: boolean }) {
  const count = room.sections.reduce((n, s) => n + s.itemIds.length, 0);
  return (
    <Link
      href={`/rooms/${room.slug}`}
      className={`group relative isolate flex h-full flex-col justify-end overflow-hidden rounded-3xl bg-ink text-sand ${
        size === 'lg' ? 'min-h-[360px] sm:min-h-[460px]' : 'min-h-[300px]'
      }`}
    >
      <Image
        src={room.photo}
        alt=""
        fill
        priority={priority}
        sizes={size === 'lg' ? '(min-width: 1024px) 50vw, 100vw' : '(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 85vw'}
        className="-z-10 object-cover transition-transform duration-[1200ms] ease-out-expo group-hover:scale-[1.05]"
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(11,12,10,0)_25%,rgba(11,12,10,0.55)_60%,rgba(11,12,10,0.9)_100%)]" aria-hidden="true" />
      <div className="flex items-end justify-between gap-4 p-5 sm:p-6">
        <div className="min-w-0">
          <p className="inline-flex rounded-full bg-ink/70 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-lime backdrop-blur">{count} materials</p>
          <h3 className={`mt-2 font-display font-bold leading-[0.95] tracking-tightest ${size === 'lg' ? 'text-[clamp(2rem,4vw,3rem)]' : 'text-[28px]'}`}>
            {room.name}
          </h3>
          <p className="mt-2 max-w-md text-[14px] leading-snug text-sand/75">{room.tagline}</p>
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sand text-ink transition-[transform,background-color] duration-500 ease-out-expo group-hover:-rotate-45 group-hover:bg-lime">
          <span className="material-symbols-outlined text-[22px]" aria-hidden="true">arrow_forward</span>
        </span>
      </div>
    </Link>
  );
}
