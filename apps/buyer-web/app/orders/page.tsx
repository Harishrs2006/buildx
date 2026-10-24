import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';

// Placeholder — order history needs sign-in, which this prototype doesn't have yet.
export default function OrdersPage() {
  return (
    <>
      <Header />
      <main className="pt-24 px-6 max-w-7xl mx-auto text-center py-24">
        <h1 className="text-3xl font-bold font-headline mb-3">Orders</h1>
        <p className="text-on-surface-variant font-body">Sign-in isn't built yet — coming soon.</p>
      </main>
      <BottomNav />
    </>
  );
}
