import { RequireOps } from '../../components/auth/RequireOps';
import { OpsNav } from '../../components/OpsNav';

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireOps>
      <OpsNav />
      <main id="main" className="mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-6 sm:pb-16 sm:pt-10">{children}</main>
    </RequireOps>
  );
}
