'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/auth/AuthProvider';
import { AuthShell } from '../../components/auth/AuthShell';
import { OtpInput } from '../../components/auth/OtpInput';

const RESEND_SECONDS = 30;

export default function SignInPage() {
  const { status, error, sendOtp, confirmOtp, phoneInFlight, resetOtp } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (status === 'signed-in') router.replace('/');
    if (status === 'needs-onboarding') router.replace('/onboard');
  }, [status, router]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const validPhone = /^[6-9]\d{9}$/.test(phone);

  async function handleSendOtp(e?: React.FormEvent) {
    e?.preventDefault();
    if (!validPhone) return;
    setSubmitting(true);
    await sendOtp(phone);
    setSubmitting(false);
    setResendIn(RESEND_SECONDS);
  }

  async function verify(value: string) {
    if (value.length !== 6 || submitting) return;
    setSubmitting(true);
    await confirmOtp(value);
    setSubmitting(false);
  }

  if (status === 'otp-sent') {
    return (
      <AuthShell step="Step 2 of 2">
        <h1 className="font-display text-[clamp(2.25rem,5vw,3rem)] font-bold leading-[0.95] tracking-tightest">Enter the code</h1>
        <p className="mt-4 text-[16px] text-stone">
          We sent a 6-digit code to <span className="font-mono text-ink">{phoneInFlight}</span>.{' '}
          <button type="button" onClick={() => { resetOtp(); setCode(''); }} className="font-medium text-cobalt hover:underline">Change number</button>
        </p>
        <form onSubmit={(e) => { e.preventDefault(); verify(code); }} className="mt-8 flex flex-col gap-5">
          <OtpInput
            value={code}
            onChange={(v) => { setCode(v); if (v.length === 6) verify(v); }}
            invalid={!!error}
            disabled={submitting}
          />
          {error && <p role="alert" className="text-[14px] text-error">{error}</p>}
          <button type="submit" disabled={submitting || code.length !== 6} className="btn-ink h-14 w-full text-[16px]">
            {submitting ? 'Verifying' : 'Verify and continue'}
          </button>
          <p className="text-center text-[14px] text-stone">
            {resendIn > 0 ? (
              <>Resend code in <span className="font-mono text-ink">0:{String(resendIn).padStart(2, '0')}</span></>
            ) : (
              <button type="button" onClick={() => handleSendOtp()} className="font-medium text-cobalt hover:underline">Resend code</button>
            )}
          </p>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell step="Step 1 of 2">
      <h1 className="font-display text-[clamp(2.25rem,5vw,3rem)] font-bold leading-[0.95] tracking-tightest">Supplier sign in</h1>
      <p className="mt-4 text-[16px] text-stone">Use your business&apos;s mobile number. We will text you a 6-digit code. New suppliers can create an account the same way.</p>
      <form onSubmit={handleSendOtp} className="mt-8 flex flex-col gap-5">
        <label className="flex flex-col gap-2">
          <span className="text-[14px] font-semibold">Mobile number</span>
          <span className="flex items-center gap-3 rounded-xl border border-sand-4 bg-sand-2 pl-4 transition-[border-color,box-shadow] focus-within:border-ink focus-within:shadow-[0_0_0_4px_rgba(200,255,61,0.55)]">
            <span className="flex items-center gap-2 border-r border-sand-4 pr-3 font-mono text-[15px]">
              <span className="rounded bg-ink px-1.5 py-0.5 text-[10px] font-semibold text-lime">IN</span>+91
            </span>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              required
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="98765 43210"
              className="h-14 w-full bg-transparent pr-4 font-mono text-[18px] tracking-wide outline-none"
            />
          </span>
          <span className="text-[13px] text-stone">Indian mobile numbers starting with 6, 7, 8 or 9.</span>
        </label>
        {error && <p role="alert" className="text-[14px] text-error">{error}</p>}
        <button type="submit" disabled={submitting || !validPhone} className="btn-ink h-14 w-full text-[16px]">
          {submitting ? 'Sending code' : 'Send code'}
          {!submitting && <span className="material-symbols-outlined text-[20px]" aria-hidden="true">arrow_forward</span>}
        </button>
      </form>
    </AuthShell>
  );
}
