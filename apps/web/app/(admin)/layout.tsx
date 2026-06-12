import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { LayoutDashboard, Package, Tag, Users, BarChart2, ShieldCheck } from 'lucide-react';

const adminNav = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/categories', label: 'Categories', icon: Tag },
  { href: '/admin/suppliers', label: 'Suppliers', icon: Users },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart2 },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect('/sign-in');

  const role = (sessionClaims?.metadata as any)?.role as string;
  if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) redirect('/dashboard');

  const user = await currentUser();

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card">
        <div className="p-6 border-b border-border flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-orange-500" />
          <span className="text-lg font-bold text-foreground">Admin Panel</span>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {adminNav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <UserButton afterSignOutUrl="/" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-orange-500 font-medium">{role}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
