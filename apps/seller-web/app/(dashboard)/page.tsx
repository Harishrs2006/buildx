'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useApiClient } from '@buildx/web-core';
import { useSupplierStats } from '../../lib/stats';
import { useSupplierOrders } from '../../lib/orders';
import { fetchSupplierProfile, type SupplierProfile } from '../../lib/auth';
import { isSetupComplete, setupGaps } from '../../lib/setup';
import { useAuth } from '../../components/auth/AuthProvider';
import { ORDER_STATUS, Pill, rupees, shortDate } from '../../components/ui';

function Stat({ label, value, icon, href, accent }: { label: string; value: string; icon: string; href?: string; accent?: boolean }) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${accent ? 'bg-lime text-ink' : 'bg-white/10 text-sand'}`}>
          <span className="material-symbols-outlined text-[22px]" aria-hidden="true">{icon}</span>
        </span>
        {href && <span className="material-symbols-outlined text-[20px] text-stone-light transition-transform group-hover:translate-x-0.5" aria-hidden="true">arrow_outward</span>}
      </div>
      <p className="mt-6 font-display text-[clamp(1.75rem,4vw,2.5rem)] font-bold leading-none tabular-nums">{value}</p>
      <p className="mt-2 text-[14px] text-stone-light">{label}</p>
    </>
  );
  const cls = 'group block rounded-2xl bg-ink-2 p-5 text-sand transition-colors hover:bg-ink-3';
  return href ? <Link href={href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}

export default function DashboardPage() {
  const client = useApiClient();
  const { user } = useAuth();
  const stats = useSupplierStats();
  const pending = useSupplierOrders(1, 'PENDING');
  const [profile, setProfile] = useState<SupplierProfile | null>(null);

  useEffect(() => {
    fetchSupplierProfile(client).then(setProfile).catch(() => {});
  }, [client]);

  // Unknown until the profile loads: treat as done so nothing flashes a wrong 'finish setup' hint
  const setupDone = profile ? isSetupComplete(profile) : true;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-stone">{profile?.businessName ?? 'Supplier overview'}</p>
          <h1 className="mt-2 font-display text-[clamp(2rem,5vw,3.25rem)] font-bold leading-[0.95] tracking-tightest">
            {greeting}{user?.name ? <>, <span className="font-serif font-normal italic">{user.name.split(' ')[0]}</span></> : ''}.
          </h1>
        </div>
        {profile?.verificationStatus === 'VERIFIED' && (
          <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-[#E3F4E8] px-3 py-1.5 text-[14px] font-medium text-tertiary sm:self-auto">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">verified</span>
            Verified supplier
          </span>
        )}
      </div>

      {profile && (() => {
        const gaps = setupGaps(profile);
        const left = [gaps.business && 'business details', gaps.area && 'delivery PIN codes', gaps.range && 'categories and brands'].filter(Boolean) as string[];
        if (left.length === 0) return null;
        return (
          <Link href="/setup" className="group flex flex-col gap-4 rounded-2xl bg-lime p-5 text-ink sm:flex-row sm:items-center">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-ink text-lime">
              <span className="material-symbols-outlined" aria-hidden="true">storefront</span>
            </span>
            <span className="flex-1">
              <span className="block font-display text-lg font-semibold">Finish your business setup ({3 - left.length} of 3 done)</span>
              <span className="block text-[15px] text-ink/75">Still needed: {left.join(', ')}. You can list products once this is done.</span>
            </span>
            <span className="btn-ink self-start px-5 sm:self-auto">Continue setup</span>
          </Link>
        );
      })()}

      {profile?.verificationStatus === 'PENDING' && (
        <div className="flex items-start gap-3 rounded-2xl bg-[#FFF4D6] px-5 py-4 text-[#5C4300]">
          <span className="material-symbols-outlined mt-0.5" aria-hidden="true">hourglass_top</span>
          <div>
            <p className="font-semibold">Your account is being verified</p>
            <p className="mt-0.5 text-[15px]">{setupDone ? 'You can list products now. Buyers can order them as soon as BuildX approves your account.' : 'Meanwhile, finish your business setup and list your products. Buyers can order once BuildX approves your account.'}</p>
          </div>
        </div>
      )}
      {profile?.verificationStatus === 'REJECTED' && (
        <div className="flex items-start gap-3 rounded-2xl bg-error-container px-5 py-4 text-on-error-container">
          <span className="material-symbols-outlined mt-0.5" aria-hidden="true">error</span>
          <div>
            <p className="font-semibold">Verification was not approved</p>
            <p className="mt-0.5 text-[15px]">Contact BuildX support to find out what is needed.</p>
          </div>
        </div>
      )}

      <section aria-label="Today at a glance" className="on-ink grid grid-cols-2 gap-3 rounded-3xl bg-ink p-3 lg:grid-cols-4">
        {stats.status === 'loading' && Array.from({ length: 4 }, (_, i) => <div key={i} className="h-[150px] animate-pulse rounded-2xl bg-ink-2" />)}
        {stats.status === 'error' && <p className="col-span-full px-4 py-6 text-[15px] text-signal-red">Couldn&apos;t load your numbers right now.</p>}
        {stats.status === 'success' && (
          <>
            <Stat label="New orders waiting" value={String(stats.data.pendingOrders)} icon="notifications_active" href="/orders" accent={stats.data.pendingOrders > 0} />
            <Stat label="Orders today" value={String(stats.data.todayOrders)} icon="today" href="/orders" />
            <Stat label="Live products" value={String(stats.data.activeProducts)} icon="inventory_2" href="/products" />
            <Stat label="Revenue from delivered orders" value={rupees.format(stats.data.totalRevenue)} icon="payments" />
          </>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="todo-title" className="card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 id="todo-title" className="font-display text-xl font-semibold tracking-tight">Needs your action</h2>
            <Link href="/orders" className="text-[14px] font-medium text-cobalt hover:underline">All orders</Link>
          </div>
          <div className="mt-4">
            {pending.status === 'loading' && <div className="skeleton h-20" />}
            {pending.status === 'error' && <p className="text-[15px] text-error">Couldn&apos;t load orders.</p>}
            {pending.status === 'success' && pending.orders.length === 0 && (
              <p className="flex items-center gap-2 rounded-xl bg-sand-3 px-4 py-4 text-[15px] text-stone">
                <span className="material-symbols-outlined text-tertiary" aria-hidden="true">task_alt</span>
                You&apos;re all caught up. New orders appear here first.
              </p>
            )}
            {pending.status === 'success' && pending.orders.length > 0 && (
              <ul className="divide-y divide-sand-4">
                {pending.orders.slice(0, 4).map((o) => (
                  <li key={o._id}>
                    <Link href="/orders" className="flex items-center gap-4 py-3.5 transition-colors hover:bg-sand-3/50">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[14px] font-medium">{o.orderNumber}</span>
                          <Pill tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Pill>
                        </div>
                        <p className="mt-1 truncate text-[14px] text-stone">
                          {shortDate.format(new Date(o.createdAt))} · {o.items.map((i) => `${i.quantity} ${i.unit.toLowerCase()} ${i.name}`).join(', ')}
                        </p>
                      </div>
                      <span className="font-display text-lg font-bold tabular-nums">{rupees.format(o.total)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section aria-labelledby="quick-title" className="flex flex-col gap-3">
          <h2 id="quick-title" className="sr-only">Quick actions</h2>
          <Link href={setupDone ? '/products/new' : '/setup'} className="group flex items-center gap-4 rounded-2xl bg-lime p-5 text-ink transition-transform hover:-translate-y-0.5">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-ink text-lime">
              <span className="material-symbols-outlined" aria-hidden="true">add</span>
            </span>
            <span className="flex-1">
              <span className="block font-display text-lg font-semibold">List a product</span>
              <span className="block text-[14px] text-ink/70">{setupDone ? 'Pick the material, brand and size' : 'Opens after business setup'}</span>
            </span>
            <span className="material-symbols-outlined transition-transform group-hover:translate-x-1" aria-hidden="true">arrow_forward</span>
          </Link>
          <Link href="/stock" className="group flex items-center gap-4 rounded-2xl border border-sand-4 bg-sand-2 p-5 transition-colors hover:border-ink">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-sand-3">
              <span className="material-symbols-outlined" aria-hidden="true">inventory_2</span>
            </span>
            <span className="flex-1">
              <span className="block font-display text-lg font-semibold">Update stock</span>
              <span className="block text-[14px] text-stone">See what is left and top it up</span>
            </span>
            <span className="material-symbols-outlined text-stone transition-transform group-hover:translate-x-1" aria-hidden="true">arrow_forward</span>
          </Link>
        </section>
      </div>
    </div>
  );
}
