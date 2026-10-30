'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/auth/AuthProvider';
import { AuthShell } from '../../components/auth/AuthShell';

export default function OnboardPage() {
  const { status, error, onboard, user } = useAuth();
  const router = useRouter();
  // Google sign-ins arrive with the account's name; phone sign-ins start as 'New User'
  const [name, setName] = useState(user && user.name !== 'New User' ? user.name : '');
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
    await onboard({ name: name.trim(), businessName: businessName.trim(), whatsappNumber });
    setSubmitting(false);
  }

  if (status !== 'needs-onboarding') return null;

  const valid = name.trim().length >= 2 && businessName.trim().length >= 2 && /^[6-9]\d{9}$/.test(whatsappNumber);

  return (
    <AuthShell step="Last step">
      <h1 className="font-display text-[clamp(2.25rem,5vw,3rem)] font-bold leading-[0.95] tracking-tightest">Set up your business</h1>
      <p className="mt-4 text-[16px] text-stone">
        So buyers know who they are ordering from. You can list products straight away; BuildX verifies new suppliers before
        their listings go live.
      </p>
      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
        <label className="flex flex-col gap-2">
          <span className="text-[14px] font-semibold">Your name</span>
          <input required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="field h-14" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[14px] font-semibold">Business name</span>
          <input required autoComplete="organization" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="field h-14" />
          <span className="text-[13px] text-stone">Shown to buyers on your listings.</span>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[14px] font-semibold">WhatsApp number</span>
          <span className="flex items-center gap-3 rounded-xl border border-sand-4 bg-sand-2 pl-4 transition-[border-color,box-shadow] focus-within:border-ink focus-within:shadow-[0_0_0_4px_rgba(200,255,61,0.55)]">
            <span className="border-r border-sand-4 pr-3 font-mono text-[15px]">+91</span>
            <input
              type="tel"
              inputMode="numeric"
              required
              maxLength={10}
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ''))}
              className="h-14 w-full bg-transparent pr-4 font-mono text-[17px] outline-none"
            />
          </span>
          <span className="text-[13px] text-stone">For order updates from BuildX. Buyers never see this number.</span>
        </label>
        {error && <p role="alert" className="text-[14px] text-error">{error}</p>}
        <button type="submit" disabled={submitting || !valid} className="btn-ink mt-2 h-14 w-full text-[16px]">
          {submitting ? 'Creating your account' : 'Create supplier account'}
        </button>
      </form>
    </AuthShell>
  );
}
