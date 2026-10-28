import Link from 'next/link';

// The BuildX mark: two load-bearing beams crossing to form an X. The lime beam sits on top,
// the same signal colour used for every primary action.
export function LogoMark({ size = 32, className = '', onDark = false }: { size?: number; className?: string; onDark?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" className={className}>
      <rect width="48" height="48" rx="12" fill={onDark ? '#1D1F1A' : '#0B0C0A'} stroke={onDark ? 'rgba(242,239,231,0.12)' : 'none'} />
      <path d="M13 11h7.5l15 26H28z" fill="#F2EFE7" />
      <path d="M35 11h-7.5l-15 26H20z" fill="#C8FF3D" />
    </svg>
  );
}

export function Logo({ tone = 'ink', href = '/' }: { tone?: 'ink' | 'sand'; href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5" aria-label="BuildX home">
      <LogoMark onDark={tone === 'sand'} className="transition-transform duration-500 ease-out-expo group-hover:rotate-[-8deg] group-hover:scale-105" />
      <span
        className={`font-display text-[22px] font-bold leading-none tracking-[-0.04em] ${
          tone === 'sand' ? 'text-sand' : 'text-ink'
        }`}
      >
        BuildX
      </span>
    </Link>
  );
}
