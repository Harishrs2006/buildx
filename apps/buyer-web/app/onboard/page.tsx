'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../components/auth/AuthProvider';

function OnboardForm() {
  const { status, error, onboard } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get('next') ?? '/';
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'signed-out') router.replace(`/signin?next=${encodeURIComponent(next)}`);
    if (status === 'signed-in') router.replace(next);
  }, [status, router, next]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await onboard(name);
    setSubmitting(false);
  }

  if (status !== 'needs-onboarding') return null;

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-sm flex-col justify-center px-6">
      <h1 className="font-headline text-2xl font-bold text-on-surface">What should we call you?</h1>
      <p className="mt-2 font-body text-sm text-on-surface-variant">Just your name — you're ready to order right after.</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="font-body text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Your name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg bg-surface-container-high px-4 py-3 font-body text-sm text-on-surface outline-none"
            placeholder="Rajan Kumar"
          />
        </label>
        {error && <p className="font-body text-sm text-error">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-lg bg-primary py-3 font-body text-sm font-bold uppercase tracking-wide text-on-primary disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Continue'}
        </button>
      </form>
    </div>
  );
}

export default function OnboardPage() {
  return (
    <Suspense>
      <OnboardForm />
    </Suspense>
  );
}
