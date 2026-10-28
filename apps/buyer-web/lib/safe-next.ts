// Post-sign-in redirect target from ?next=. Only same-site paths are allowed, so a crafted
// link like /signin?next=https://evil.example cannot bounce a buyer off BuildX.
export function safeNext(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/';
  return raw;
}
