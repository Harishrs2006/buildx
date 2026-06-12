import { auth } from '@clerk/nextjs/server';
import { Package, ShoppingCart, FileText, TrendingUp } from 'lucide-react';

export default async function DashboardPage() {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as any)?.role as string;
  const isBuyer = role === 'BUYER';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isBuyer ? 'Manage your orders and quotations' : 'Manage your products and orders'}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isBuyer ? (
          <>
            <StatCard icon={ShoppingCart} label="Active Orders" value="0" trend="+0%" />
            <StatCard icon={FileText} label="Open Quotations" value="0" trend="+0%" />
            <StatCard icon={Package} label="Products Browsed" value="0" trend="+0%" />
            <StatCard icon={TrendingUp} label="Total Spent" value="₹0" trend="+0%" />
          </>
        ) : (
          <>
            <StatCard icon={Package} label="Active Products" value="0" trend="+0%" />
            <StatCard icon={ShoppingCart} label="Pending Orders" value="0" trend="+0%" />
            <StatCard icon={FileText} label="Quote Requests" value="0" trend="+0%" />
            <StatCard icon={TrendingUp} label="Revenue (MTD)" value="₹0" trend="+0%" />
          </>
        )}
      </div>

      {/* Placeholder — populated in Phase 5 */}
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
        <p className="text-muted-foreground text-sm">
          Your activity will appear here once you start using the marketplace.
        </p>
        <a
          href="/products"
          className="inline-flex items-center gap-2 text-sm font-medium text-orange-500 hover:text-orange-600"
        >
          Browse products →
        </a>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  trend,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  trend: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="p-2 rounded-lg bg-muted">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{trend} this month</p>
      </div>
    </div>
  );
}
