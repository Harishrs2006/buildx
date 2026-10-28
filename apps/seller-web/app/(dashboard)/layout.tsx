import { RequireSupplier } from '../../components/auth/RequireSupplier';
import { DashboardNav } from '../../components/DashboardNav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireSupplier>
      <DashboardNav />
      <main id="main" className="mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-6 sm:pb-16 sm:pt-10">{children}</main>
    </RequireSupplier>
  );
}
