'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../components/auth/AuthProvider';
import { AuthShell } from '../../components/auth/AuthShell';
import { OtpInput } from '../../components/auth/OtpInput';
import { safeNext } from '../../lib/safe-next';

const RESEND_AFTER_S = 30;

function formatPhone(digits: string) {
  return digits.length > 5 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits;
}

function SignInForm() {
  const { status, error, sendOtp, confirmOtp, resetOtp, phoneInFlight } = useAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get('next'));
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resendIn, setResendIn] = useState(RESEND_AFTER_S);
  const lastTried = useRef('');

  const phoneValid = /^[6-9]\d{9}$/.test(phone);
  const otpStep = status === 'otp-sent';

  useEffect(() => {
    if (status === 'signed-in') router.replace(next);
    if (status === 'needs-onboarding') router.replace(`/onboard?next=${encodeURIComponent(next)}`);
  }, [status, router, next]);

  // Resend countdown restarts each time a code is sent
  useEffect(() => {
    if (!otpStep) return;
    setResendIn(RESEND_AFTER_S);
    const t = setInterval(() => setResendIn((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [otpStep, phoneInFlight]);

  async function handleSendOtp(e?: React.FormEvent) {
    e?.preventDefault();
    if (!phoneValid || submitting) return;
    setSubmitting(true);
    await sendOtp(phone);
    setSubmitting(false);
  }

  async function verify(value: string) {
    if (value.length !== 6 || submitting || lastTried.current === value) return;
    lastTried.current = value;
    setSubmitting(true);
    await confirmOtp(value);
    setSubmitting(false);
  }

  // Auto-submit as soon as all six digits are in (typed, pasted or autofilled from SMS)
  useEffect(() => {
    if (otpStep && code.length === 6) void verify(code);
    if (code.length < 6) lastTried.current = '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, otpStep]);

  async function resend() {
    setCode('');
    lastTried.current = '';
    setSubmitting(true);
    await sendOtp(phone);
    setSubmitting(false);
    setResendIn(RESEND_AFTER_S);
  }

  function changeNumber() {
    setCode('');
    lastTried.current = '';
    resetOtp();
  }

  if (status === 'config-error') {
    return (
      <AuthShell>
        <h1 className="font-display text-4xl font-bold tracking-tightest">Sign-in is not available yet</h1>
        <p className="mt-4 text-[16px] leading-relaxed text-stone">
          Phone sign-in has not been configured for this site. You can still browse materials and check delivery.
        </p>
        <Link href="/" className="btn-ink mt-8 self-start">Browse materials</Link>
      </AuthShell>
    );
  }

  if (status === 'wrong-role') {
    return (
      <AuthShell>
        <h1 className="font-display text-4xl font-bold tracking-tightest">This number is not a buyer account</h1>
        <p className="mt-4 text-[16px] leading-relaxed text-stone">
          It is already registered on BuildX with a different role, such as a supplier. Use another number to shop here.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell step={otpStep ? 'Step 2 of 2' : 'Step 1 of 2'}>
      {!otpStep ? (
        <form onSubmit={handleSendOtp} noValidate className="animate-fade-up">
          <h1 className="font-display text-[clamp(2.4rem,6vw,3.25rem)] font-bold leading-[0.95] tracking-tightest">
            Sign in or create an account
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-stone">
            Enter your mobile number. We will text you a 6-digit code. New to BuildX? This creates your account.
          </p>

          <label htmlFor="phone" className="mt-10 block text-[13px] font-semibold text-ink">
            Mobile number
          </label>
          <div className="group mt-2 flex h-16 items-center rounded-2xl border border-sand-4 bg-sand-2 transition-[border-color,box-shadow] duration-200 focus-within:border-ink focus-within:shadow-[0_0_0_4px_rgba(200,255,61,0.55)]">
            <span className="flex h-full items-center gap-2 border-r border-sand-4 pl-5 pr-4 text-[16px] font-medium text-ink">
              <span aria-hidden="true" className="eyebrow rounded-md bg-ink px-1.5 py-1 text-[10px] text-lime">IN</span>
              +91
            </span>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              autoFocus
              required
              value={formatPhone(phone)}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="98765 43210"
              aria-describedby="phone-hint phone-error"
              aria-invalid={(phone.length === 10 && !phoneValid) || undefined}
              className="h-full w-full bg-transparent px-4 font-mono text-[20px] tracking-wide text-ink outline-none placeholder:text-stone-light"
            />
            {phoneValid && (
              <span className="material-symbols-outlined mr-4 animate-fade-up text-[24px] text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
                check_circle
              </span>
            )}
          </div>
          <p id="phone-hint" className="mt-2 text-[13px] text-stone">
            Indian mobile numbers only, starting with 6, 7, 8 or 9.
          </p>
          <p id="phone-error" role="alert" className="mt-2 min-h-[20px] text-[14px] font-medium text-error">
            {phone.length === 10 && !phoneValid ? 'That does not look like an Indian mobile number.' : error}
          </p>

          <button type="submit" disabled={!phoneValid || submitting} className="btn-ink mt-4 h-14 w-full text-[16px]">
            {submitting ? <Spinner label="Sending code" /> : <>Send code <span className="material-symbols-outlined text-[20px]" aria-hidden="true">arrow_forward</span></>}
          </button>

          <p className="mt-6 text-[13px] leading-relaxed text-stone">
            By continuing you agree to the BuildX{' '}
            <Link href="/terms" className="font-medium text-ink underline underline-offset-2">Terms of service</Link> and{' '}
            <Link href="/privacy" className="font-medium text-ink underline underline-offset-2">Privacy policy</Link>. Standard SMS
            rates may apply.
          </p>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void verify(code);
          }}
          className="animate-fade-up"
        >
          <h1 className="font-display text-[clamp(2.4rem,6vw,3.25rem)] font-bold leading-[0.95] tracking-tightest">Enter the code</h1>
          <p className="mt-4 text-[16px] leading-relaxed text-stone">
            We sent a 6-digit code to <span className="font-mono font-medium text-ink">{phoneInFlight}</span>.{' '}
            <button type="button" onClick={changeNumber} className="font-medium text-cobalt underline-offset-2 hover:underline">
              Change number
            </button>
          </p>

          <div className="mt-10">
            <OtpInput value={code} onChange={setCode} invalid={!!error && code.length === 6} disabled={submitting} />
          </div>
          <p role="alert" className="mt-3 min-h-[20px] text-[14px] font-medium text-error">{error}</p>

          <button type="submit" disabled={code.length !== 6 || submitting} className="btn-ink mt-4 h-14 w-full text-[16px]">
            {submitting ? <Spinner label="Verifying" /> : 'Verify and continue'}
          </button>

          <div className="mt-6 flex items-center justify-center text-[14px] text-stone">
            {resendIn > 0 ? (
              <span>
                Resend code in <span className="font-mono text-ink">0:{String(resendIn).padStart(2, '0')}</span>
              </span>
            ) : (
              <button type="button" onClick={resend} disabled={submitting} className="font-semibold text-ink underline underline-offset-4 hover:text-cobalt">
                Resend code
              </button>
            )}
          </div>
        </form>
      )}
    </AuthShell>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <>
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
      {label}
    </>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
