'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/auth/AuthProvider';
import { AuthShell } from '../../components/auth/AuthShell';
import { OtpInput } from '../../components/auth/OtpInput';

const RESEND_SECONDS = 30;
// SMS codes need Firebase's paid plan, so sellers sign in with Google. The phone form stays for the
// Firebase test numbers (and for later): set NEXT_PUBLIC_PHONE_SIGNIN=true to show it.
const PHONE_SIGNIN = process.env.NEXT_PUBLIC_PHONE_SIGNIN === 'true';

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export default function SignInPage() {
  const { status, error, sendOtp, signInWithGoogle, confirmOtp, phoneInFlight, resetOtp } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [googleBusy, setGoogleBusy] = useState(false);

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

  async function handleGoogle() {
    setGoogleBusy(true);
    await signInWithGoogle();
    setGoogleBusy(false);
  }

  async function verify(value: string) {
    if (value.length !== 6 || submitting) return;
    setSubmitting(true);
    await confirmOtp(value);
    setSubmitting(false);
  }

  if (status === 'otp-sent') {
    return (
      <AuthShell step="Step 2 of 2" recaptcha>
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

  // While Firebase finishes signing in and BuildX loads the account, keep the button busy
  const signingIn = googleBusy || status === 'loading';

  return (
    <AuthShell step="Sign in" recaptcha={PHONE_SIGNIN}>
      <h1 className="font-display text-[clamp(2.25rem,5vw,3rem)] font-bold leading-[0.95] tracking-tightest">Supplier sign in</h1>
      <p className="mt-4 text-[16px] text-stone">Sign in with your Google account. New suppliers create an account the same way, it takes a few seconds and costs nothing.</p>
      <div className="mt-8 flex flex-col gap-5">
        <button
          type="button"
          onClick={handleGoogle}
          disabled={signingIn}
          className="flex h-14 w-full items-center justify-center gap-3 rounded-xl border border-sand-4 bg-white text-[16px] font-semibold text-ink transition-[border-color,box-shadow] hover:border-ink focus-visible:shadow-[0_0_0_4px_rgba(200,255,61,0.55)] focus-visible:outline-none disabled:opacity-60"
        >
          <GoogleMark />
          {signingIn ? 'Signing in' : 'Continue with Google'}
        </button>
        {error && <p role="alert" className="text-[14px] text-error">{error}</p>}
        <p className="text-[13px] text-stone">We only use your name and email to set up your seller account. You add your WhatsApp number in the next step for order updates.</p>
      </div>
      {PHONE_SIGNIN && (
        <>
          <div className="my-8 flex items-center gap-3 text-[13px] text-stone">
            <span className="h-px flex-1 bg-sand-4" />or use your mobile number<span className="h-px flex-1 bg-sand-4" />
          </div>
          <form onSubmit={handleSendOtp} className="flex flex-col gap-5">
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
            <button type="submit" disabled={submitting || !validPhone} className="btn-ink h-14 w-full text-[16px]">
              {submitting ? 'Sending code' : 'Send code'}
              {!submitting && <span className="material-symbols-outlined text-[20px]" aria-hidden="true">arrow_forward</span>}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
