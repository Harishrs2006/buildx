'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './auth/AuthProvider';

const TABS = [
  { href: '/', label: 'Dashboard', icon: 'dashboard' },
  { href: '/products', label: 'Products', icon: 'inventory_2' },
  { href: '/orders', label: 'Orders', icon: 'receipt_long' },
] as const;

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function DashboardNav() {
  const pathname = usePathname();
  const { signOut, user } = useAuth();

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between gap-4 bg-surface-container-lowest/90 px-4 py-3 backdrop-blur-xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] sm:px-6">
      <div className="flex items-center gap-6">
        <span className="font-headline text-xl font-bold uppercase tracking-tighter text-on-surface">
          BuildX <span className="text-primary">Seller</span>
        </span>
        <nav className="hidden items-center gap-1 sm:flex">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={
                isActive(pathname, tab.href)
                  ? 'flex items-center gap-1.5 rounded-lg bg-primary-container px-4 py-2 font-body text-sm font-semibold text-on-primary-container'
                  : 'flex items-center gap-1.5 rounded-lg px-4 py-2 font-body text-sm font-semibold text-on-surface-variant hover:text-primary'
              }
            >
              <span className="material-symbols-outlined text-lg">{tab.icon}</span>
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        {user && <span className="hidden font-body text-sm text-on-surface-variant md:inline">{user.name}</span>}
        <button
          onClick={() => signOut()}
          className="flex items-center gap-1 rounded-lg px-3 py-2 font-body text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high"
        >
          <span className="material-symbols-outlined text-lg">logout</span>
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
      <nav className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around border-t border-outline-variant bg-surface-container-lowest/95 px-2 py-2 backdrop-blur-xl sm:hidden">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              isActive(pathname, tab.href)
                ? 'flex flex-col items-center gap-0.5 rounded-lg bg-primary-container px-5 py-1.5 text-on-primary-container'
                : 'flex flex-col items-center gap-0.5 px-5 py-1.5 text-on-surface-variant'
            }
          >
            <span className="material-symbols-outlined">{tab.icon}</span>
            <span className="font-body text-[10px] font-semibold uppercase tracking-widest">{tab.label}</span>
          </Link>
        ))}
      </nav>
    </header>
  );
}
