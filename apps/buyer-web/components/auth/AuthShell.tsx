import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo, LogoMark } from '../brand/Logo';
import { SplitLines } from '../motion/Reveal';

const POINTS = [
  { icon: 'account_circle', text: 'Sign in with Google, no new password' },
  { icon: 'pin_drop', text: 'Delivery checked against your site PIN' },
  { icon: 'payments', text: 'Pay cash when materials arrive' },
];

// Split-screen frame for sign-in and onboarding: brand story on ink (desktop), form on sand.
// recaptcha: show Google's required reCAPTCHA notice, only on screens that send an SMS code
export function AuthShell({ children, step, recaptcha = false }: { children: ReactNode; step?: string; recaptcha?: boolean }) {
  return (
    <div className="grid min-h-[100svh] lg:grid-cols-[1.05fr_1fr]">
      <aside className="on-ink grain relative hidden overflow-hidden bg-ink p-12 text-sand lg:flex lg:flex-col xl:p-16">
        <div className="blueprint absolute inset-0 [mask-image:linear-gradient(180deg,#000,transparent_85%)]" aria-hidden="true" />
        <div className="absolute -bottom-40 -left-40 h-[520px] w-[520px] rounded-full bg-lime/15 blur-[120px]" aria-hidden="true" />

        <div className="relative">
          <Logo tone="sand" />
        </div>

        <div className="relative mt-auto">
          <h2 className="font-display text-[clamp(3rem,5vw,4.75rem)] font-bold leading-[0.92] tracking-tightest">
            <SplitLines
              start={100}
              lines={[
                'Order for',
                'the site,',
                <em key="e" className="font-serif font-normal italic text-lime">
                  not the queue.
                </em>,
              ]}
            />
          </h2>
          <ul className="mt-10 space-y-4">
            {POINTS.map((p, i) => (
              <li
                key={p.text}
                className="flex animate-fade-up items-center gap-4 text-[15px] text-sand/75"
                style={{ animationDelay: `${500 + i * 120}ms` }}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-lime">
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{p.icon}</span>
                </span>
                {p.text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mt-16 flex items-center justify-between border-t border-white/10 pt-6 text-[12px] text-sand/40">
          <span className="font-mono uppercase tracking-[0.16em]">Construction materials marketplace</span>
          <LogoMark size={22} onDark />
        </div>
      </aside>

      <main id="main" className="relative flex flex-col px-5 py-6 sm:px-10 lg:px-16 lg:py-10">
        <div className="flex items-center justify-between">
          <div className="lg:hidden">
            <Logo />
          </div>
          <Link
            href="/"
            className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[14px] font-medium text-stone transition-colors hover:bg-ink/5 hover:text-ink"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
            Back to store
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-12">
          {step && <p className="eyebrow mb-5 text-stone">{step}</p>}
          {children}
        </div>

        {recaptcha && <p className="mx-auto max-w-[420px] text-center text-[12px] leading-relaxed text-stone">
          Protected by reCAPTCHA. Google&apos;s{' '}
          <a className="underline underline-offset-2 hover:text-ink" href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">
            Privacy Policy
          </a>{' '}
          and{' '}
          <a className="underline underline-offset-2 hover:text-ink" href="https://policies.google.com/terms" target="_blank" rel="noreferrer">
            Terms
          </a>{' '}
          apply.
        </p>}
      </main>
    </div>
  );
}
