'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useApiClient } from '@sthiva/web-core';
import { getFirebaseAuth } from '../lib/firebase';
import { Pill, shortDate } from './ui';

// Papers Sthiva checks before verifying a supplier: GST certificate (if GST-registered) and a shop
// licence or Udyam certificate. Files are kept private; only Sthiva's team can open them.

const docSchema = z.object({
  type: z.enum(['GST', 'SHOP_LICENSE', 'UDYAM']).or(z.string()),
  label: z.string(),
  status: z.enum(['SUBMITTED', 'ACCEPTED', 'REJECTED']),
  note: z.string().optional(),
  uploadedAt: z.string().optional(),
});
type Doc = z.infer<typeof docSchema>;

const SLOTS = [
  { type: 'GST', title: 'GST certificate', hint: 'Only if your business is GST-registered.' },
  { type: 'SHOP_LICENSE', title: 'Shop licence', hint: 'Shop and establishment or trade licence. Or upload a Udyam certificate below.' },
  { type: 'UDYAM', title: 'Udyam certificate', hint: 'If you have Udyam (MSME) registration instead of a shop licence.' },
] as const;

const STATUS = {
  SUBMITTED: { label: 'Waiting for Sthiva', tone: 'wait' as const },
  ACCEPTED: { label: 'Accepted', tone: 'done' as const },
  REJECTED: { label: 'Please upload again', tone: 'bad' as const },
};

async function call(baseUrl: string, init?: RequestInit) {
  const token = await getFirebaseAuth().currentUser?.getIdToken();
  if (!token) throw new Error('Sign in again to continue');
  const res = await fetch(`${baseUrl}/suppliers/me/documents`, { ...init, headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.success !== true) throw new Error(json?.error?.message ?? 'Something went wrong. Try again.');
  return z.array(docSchema).parse(json.data.documents);
}

export function VerificationDocuments() {
  const client = useApiClient();
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    call(client.baseUrl).then(setDocs).catch((e) => setError(e instanceof Error ? e.message : 'Couldn’t load your documents.'));
  }, [client]);

  async function upload(type: string, file: File | undefined) {
    if (!file) return;
    setBusy(type);
    setError(null);
    const form = new FormData();
    form.append('type', type);
    form.append('file', file);
    try { setDocs(await call(client.baseUrl, { method: 'POST', body: form })); }
    catch (e) { setError(e instanceof Error ? e.message : 'Upload failed. Try again.'); }
    finally { setBusy(null); }
  }

  return (
    <section className="card flex flex-col gap-4 p-5 sm:p-6" aria-labelledby="docs-title">
      <div>
        <h2 id="docs-title" className="text-[18px] font-semibold">Verification documents</h2>
        <p className="mt-1 text-[14px] text-stone">
          Sthiva checks these before giving you the Verified badge. They are kept private: only Sthiva&apos;s team can open them. JPEG, PNG or PDF, up to 5 MB.
        </p>
      </div>
      {error && <p role="alert" className="text-[14px] text-error">{error}</p>}
      <ul className="flex flex-col gap-3">
        {SLOTS.map((slot) => {
          const doc = docs?.find((d) => d.type === slot.type);
          const st = doc ? STATUS[doc.status] : null;
          return (
            <li key={slot.type} className="flex flex-col gap-2 rounded-xl border border-sand-4 p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{slot.title}</p>
                  {st && <Pill tone={st.tone}>{st.label}</Pill>}
                </div>
                <p className="text-[14px] text-stone">
                  {doc?.status === 'REJECTED' && doc.note ? `Sthiva says: ${doc.note}` : doc?.uploadedAt ? `Uploaded ${shortDate.format(new Date(doc.uploadedAt))}` : slot.hint}
                </p>
              </div>
              <label className={`btn-ghost cursor-pointer self-start ${busy ? 'pointer-events-none opacity-60' : ''}`}>
                {busy === slot.type ? 'Uploading' : doc ? 'Replace' : 'Upload'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  className="sr-only"
                  disabled={!!busy}
                  onChange={(e) => { upload(slot.type, e.target.files?.[0]); e.target.value = ''; }}
                />
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
