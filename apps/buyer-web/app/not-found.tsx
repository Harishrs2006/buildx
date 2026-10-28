import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';

export default function NotFound() {
  return (
    <main id="main" className="on-ink grain relative flex min-h-[100svh] flex-col overflow-hidden bg-ink text-sand">
      <div className="blueprint absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,#000_20%,transparent_70%)]" aria-hidden="true" />
      <div className="container-x relative flex h-[var(--header-h)] items-center">
        <Logo tone="sand" />
      </div>
      <div className="container-x relative flex flex-1 flex-col items-center justify-center pb-24 text-center">
        <p className="eyebrow animate-fade-up text-lime">Error 404</p>
        <h1 className="mt-6 font-display text-[clamp(6rem,22vw,16rem)] font-extrabold leading-[0.8] tracking-[-0.06em]">
          <span className="line-mask"><span>4<span className="text-lime">0</span>4</span></span>
        </h1>
        <p className="mt-8 max-w-md animate-fade-up text-[18px] text-sand/65" style={{ animationDelay: '250ms' }}>
          This page is still under construction, or it was never on the plan.
        </p>
        <div className="mt-10 flex animate-fade-up flex-wrap justify-center gap-3" style={{ animationDelay: '400ms' }}>
          <Link href="/" className="btn-lime">Back to home</Link>
          <Link href="/search" className="btn-ghost-dark">Search materials</Link>
        </div>
      </div>
    </main>
  );
}
