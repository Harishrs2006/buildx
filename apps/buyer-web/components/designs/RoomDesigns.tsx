'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useApiClient, useSelectedLocation } from '@sthiva/web-core';
import { DesignCard } from './DesignCard';
import { fetchDesigns, type Design } from '@/lib/designs';

// Live designs for the items in a room (e.g. kitchens and storage for the kitchen). Shows nothing
// until suppliers have designs here, so a room page never shows an empty block.
export function RoomDesigns({ kinds, roomName }: { kinds: string[]; roomName: string }) {
  const client = useApiClient();
  const location = useSelectedLocation();
  const [designs, setDesigns] = useState<Design[]>([]);

  useEffect(() => {
    let live = true;
    fetchDesigns(client, { kinds, pincode: location?.pincode })
      .then((d) => live && setDesigns(d.designs.slice(0, 6)))
      .catch(() => live && setDesigns([]));
    return () => { live = false; };
  }, [client, kinds, location?.pincode]);

  if (designs.length === 0) return null;
  return (
    <section aria-labelledby="room-designs">
      <div className="flex items-end justify-between gap-4 border-b border-ink/10 pb-4">
        <h2 id="room-designs" className="font-display text-[clamp(1.6rem,3vw,2.25rem)] font-bold leading-tight tracking-tightest">
          {roomName} designs <span className="font-serif font-normal italic">from local makers</span>
        </h2>
        <Link href="/designs" className="shrink-0 text-[14px] font-medium underline underline-offset-4">All designs</Link>
      </div>
      <ul className="mt-6 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {designs.map((d) => <li key={d._id}><DesignCard design={d} /></li>)}
      </ul>
    </section>
  );
}
