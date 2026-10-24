'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/auth/AuthProvider';

export default function OnboardPage() {
  const { status, error, onboard } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'signed-out') router.replace('/signin');
    if (status === 'signed-in') router.replace('/');
  }, [status, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await onboard({ name, businessName, whatsappNumber });
    setSubmitting(false);
  }

  if (status !== 'needs-onboarding') return null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="font-headline text-2xl font-bold text-on-surface">Set up your seller account</h1>
        <p className="mt-2 font-body text-sm text-on-surface-variant">
          A few details so buyers know who they're ordering from. You can start listing products
          right away — BuildX verifies new sellers in the background.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-body text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Your name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg bg-surface-container-high px-4 py-3 font-body text-sm text-on-surface outline-none"
              placeholder="Ramappa Gowda"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-body text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Business name</span>
            <input
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="rounded-lg bg-surface-container-high px-4 py-3 font-body text-sm text-on-surface outline-none"
              placeholder="Gowda Traders"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-body text-xs font-semibold uppercase tracking-wide text-on-surface-variant">WhatsApp number</span>
            <div className="flex items-center rounded-lg bg-surface-container-high px-4">
              <span className="font-body text-sm text-on-surface-variant">+91</span>
              <input
                type="tel"
                inputMode="numeric"
                required
                pattern="[6-9][0-9]{9}"
                maxLength={10}
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-transparent py-3 pl-2 font-body text-sm text-on-surface outline-none"
                placeholder="98765 43210"
              />
            </div>
            <span className="font-body text-xs text-on-surface-variant">For order updates from BuildX — buyers never see this.</span>
          </label>
          {error && <p className="font-body text-sm text-error">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-lg bg-primary py-3 font-body text-sm font-bold uppercase tracking-wide text-on-primary disabled:opacity-50"
          >
            {submitting ? 'Creating account…' : 'Create seller account'}
          </button>
        </form>
      </div>
    </div>
  );
}
