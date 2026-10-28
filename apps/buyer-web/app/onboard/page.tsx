'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../components/auth/AuthProvider';
import { AuthShell } from '../../components/auth/AuthShell';
import { safeNext } from '../../lib/safe-next';

function OnboardForm() {
  const { status, error, onboard, user } = useAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get('next'));
  const [name, setName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'signed-out') router.replace(`/signin?next=${encodeURIComponent(next)}`);
    if (status === 'signed-in') router.replace(next);
  }, [status, router, next]);

  const trimmed = name.trim();
  const canSubmit = trimmed.length >= 2 && agreed && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    await onboard(trimmed);
    setSubmitting(false);
  }

  if (status !== 'needs-onboarding') {
    return (
      <AuthShell>
        <div className="flex justify-center py-16" role="status" aria-label="Loading">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-ink border-t-transparent" />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell step="Last step">
      <form onSubmit={handleSubmit} className="animate-fade-up" noValidate>
        <span className="mb-6 inline-grid h-14 w-14 place-items-center rounded-2xl bg-lime text-ink">
          <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
            waving_hand
          </span>
        </span>
        <h1 className="font-display text-[clamp(2.4rem,6vw,3.25rem)] font-bold leading-[0.95] tracking-tightest">
          Welcome to BuildX
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-stone">
          {user?.phone ? (
            <>
              Your number <span className="font-mono text-ink">{user.phone}</span> is verified.{' '}
            </>
          ) : null}
          Tell us what to call you and you can start ordering.
        </p>

        <label htmlFor="name" className="mt-10 block text-[13px] font-semibold text-ink">
          Your full name
        </label>
        <input
          id="name"
          required
          autoFocus
          autoComplete="name"
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="field mt-2 h-14 rounded-2xl text-[17px]"
          placeholder="Rajan Kumar"
        />

        <label className="mt-6 flex cursor-pointer items-start gap-3 text-[14px] leading-relaxed text-stone">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded accent-ink"
          />
          <span>
            I am 18 or older and I agree to the{' '}
            <Link href="/terms" target="_blank" className="font-medium text-ink underline underline-offset-2">Terms of service</Link> and{' '}
            <Link href="/privacy" target="_blank" className="font-medium text-ink underline underline-offset-2">Privacy policy</Link>.
          </span>
        </label>

        <p role="alert" className="mt-4 min-h-[20px] text-[14px] font-medium text-error">{error}</p>

        <button type="submit" disabled={!canSubmit} className="btn-ink mt-2 h-14 w-full text-[16px]">
          {submitting ? 'Setting up your account' : 'Start ordering'}
          {!submitting && <span className="material-symbols-outlined text-[20px]" aria-hidden="true">arrow_forward</span>}
        </button>
      </form>
    </AuthShell>
  );
}

export default function OnboardPage() {
  return (
    <Suspense>
      <OnboardForm />
    </Suspense>
  );
}
