'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../components/auth/AuthProvider';

function SignInForm() {
  const { status, error, sendOtp, confirmOtp, phoneInFlight } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get('next') ?? '/';
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'signed-in') router.replace(next);
    if (status === 'needs-onboarding') router.replace(`/onboard?next=${encodeURIComponent(next)}`);
  }, [status, router, next]);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await sendOtp(phone);
    setSubmitting(false);
  }

  async function handleConfirmOtp(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await confirmOtp(code);
    setSubmitting(false);
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-sm flex-col justify-center px-6">
      <h1 className="font-headline text-3xl font-bold uppercase tracking-tighter text-on-surface">Sign in</h1>
      <p className="mt-2 font-body text-sm text-on-surface-variant">
        Sign in with your mobile number to order and track deliveries.
      </p>

      {status !== 'otp-sent' ? (
        <form onSubmit={handleSendOtp} className="mt-8 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-body text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Mobile number</span>
            <div className="flex items-center rounded-lg bg-surface-container-high px-4">
              <span className="font-body text-sm text-on-surface-variant">+91</span>
              <input
                type="tel"
                inputMode="numeric"
                required
                pattern="[6-9][0-9]{9}"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="98765 43210"
                className="w-full bg-transparent py-3 pl-2 font-body text-sm text-on-surface outline-none"
              />
            </div>
          </label>
          {error && <p className="font-body text-sm text-error">{error}</p>}
          <button
            type="submit"
            disabled={submitting || phone.length !== 10}
            className="rounded-lg bg-primary py-3 font-body text-sm font-bold uppercase tracking-wide text-on-primary disabled:opacity-50"
          >
            {submitting ? 'Sending code…' : 'Send OTP'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleConfirmOtp} className="mt-8 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-body text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Code sent to {phoneInFlight}
            </span>
            <input
              type="text"
              inputMode="numeric"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className="rounded-lg bg-surface-container-high px-4 py-3 font-body text-sm tracking-[0.3em] text-on-surface outline-none"
            />
          </label>
          {error && <p className="font-body text-sm text-error">{error}</p>}
          <button
            type="submit"
            disabled={submitting || code.length !== 6}
            className="rounded-lg bg-primary py-3 font-body text-sm font-bold uppercase tracking-wide text-on-primary disabled:opacity-50"
          >
            {submitting ? 'Verifying…' : 'Verify & continue'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
