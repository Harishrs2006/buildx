import Link from 'next/link';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { ShoppingCart, Menu } from 'lucide-react';

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold text-orange-500 shrink-0">
            BuildX
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/products" className="text-muted-foreground hover:text-foreground transition-colors">
              Products
            </Link>
            <Link href="/categories" className="text-muted-foreground hover:text-foreground transition-colors">
              Categories
            </Link>
            <Link href="/suppliers" className="text-muted-foreground hover:text-foreground transition-colors">
              Suppliers
            </Link>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <SignedIn>
              <Link
                href="/dashboard/cart"
                className="relative p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <ShoppingCart className="w-5 h-5 text-muted-foreground" />
              </Link>
              <Link
                href="/dashboard"
                className="hidden sm:inline-flex h-9 px-4 items-center rounded-lg bg-muted text-sm font-medium hover:bg-muted/80 transition-colors"
              >
                Dashboard
              </Link>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>

            <SignedOut>
              <Link
                href="/sign-in"
                className="h-9 px-4 inline-flex items-center rounded-lg text-sm font-medium hover:bg-muted transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="h-9 px-4 inline-flex items-center rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors"
              >
                Get started
              </Link>
            </SignedOut>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border py-10 mt-16">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <p className="text-lg font-bold text-orange-500 mb-3">BuildX</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              India's B2B marketplace for construction materials.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold mb-3">Marketplace</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/products" className="hover:text-foreground">All Products</Link></li>
              <li><Link href="/categories" className="hover:text-foreground">Categories</Link></li>
              <li><Link href="/suppliers" className="hover:text-foreground">Suppliers</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold mb-3">Account</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/sign-up" className="hover:text-foreground">Get started</Link></li>
              <li><Link href="/sign-in" className="hover:text-foreground">Sign in</Link></li>
              <li><Link href="/dashboard" className="hover:text-foreground">Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold mb-3">Legal</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/privacy" className="hover:text-foreground">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-foreground">Terms</Link></li>
            </ul>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-8">
          © {new Date().getFullYear()} BuildX. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
