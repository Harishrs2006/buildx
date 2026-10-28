import Link from 'next/link';
import type { ReactNode } from 'react';
import type { BuyerOrder } from '@/lib/orders';

// Shared building blocks for the signed-in buyer screens (cart, checkout, orders, profile)

export function PageHead({ eyebrow, title, accent, children }: { eyebrow: string; title: string; accent?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="eyebrow text-stone">{eyebrow}</p>
        <h1 className="mt-3 font-display text-[clamp(2.5rem,6vw,4.25rem)] font-bold leading-[0.95] tracking-tightest">
          {title}
          {accent && <> <span className="font-serif font-normal italic">{accent}</span></>}
        </h1>
      </div>
      {children}
    </div>
  );
}

export function EmptyState({ icon, title, body, cta }: { icon: string; title: string; body: string; cta?: { href: string; label: string } }) {
  return (
    <div className="card blueprint-light flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-lime">
        <span className="material-symbols-outlined text-[26px]" aria-hidden="true">{icon}</span>
      </span>
      <p className="font-display text-2xl font-semibold tracking-tight">{title}</p>
      <p className="max-w-sm text-[15px] text-stone">{body}</p>
      {cta && (
        <Link href={cta.href} className="btn-ink mt-3">
          {cta.label}
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_forward</span>
        </Link>
      )}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="card flex items-center gap-2 px-5 py-4 text-[15px] text-error">
      <span className="material-symbols-outlined text-[20px]" aria-hidden="true">error</span>
      {children}
    </p>
  );
}

const STATUS: Record<BuyerOrder['status'], { label: string; tone: 'active' | 'done' | 'bad' | 'wait' }> = {
  PENDING: { label: 'Placed', tone: 'wait' },
  CONFIRMED: { label: 'Confirmed', tone: 'active' },
  READY_FOR_PICKUP: { label: 'Ready for pickup', tone: 'active' },
  ASSIGNED: { label: 'Driver assigned', tone: 'active' },
  PICKED_UP: { label: 'Picked up', tone: 'active' },
  IN_TRANSIT: { label: 'Out for delivery', tone: 'active' },
  DELIVERED: { label: 'Delivered', tone: 'done' },
  CANCELLED: { label: 'Cancelled', tone: 'bad' },
  DISPUTED: { label: 'Disputed', tone: 'bad' },
};

const TONE = {
  wait: 'bg-sand-3 text-ink',
  active: 'bg-cobalt-soft text-[#0F2A8A]',
  done: 'bg-ink text-lime',
  bad: 'bg-error-container text-on-error-container',
};

export function statusLabel(status: BuyerOrder['status']): string {
  return STATUS[status].label;
}

export function StatusPill({ status }: { status: BuyerOrder['status'] }) {
  const s = STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.12em] ${TONE[s.tone]}`}>
      {s.tone === 'active' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cobalt" aria-hidden="true" />}
      {s.label}
    </span>
  );
}

export function SummaryRow({ label, value, strong, onDark }: { label: string; value: string; strong?: boolean; onDark?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 ${strong ? 'pt-1 font-display text-xl font-bold' : 'text-[15px]'}`}>
      <span className={strong ? '' : onDark ? 'text-stone-light' : 'text-stone'}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
