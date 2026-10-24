import { RequireSupplier } from '../../components/auth/RequireSupplier';
import { DashboardNav } from '../../components/DashboardNav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireSupplier>
      <DashboardNav />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6 sm:pb-10">{children}</main>
    </RequireSupplier>
  );
}
