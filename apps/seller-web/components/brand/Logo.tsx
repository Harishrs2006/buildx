import Link from 'next/link';
import { SthivaLogo, SthivaMark } from '@sthiva/web-core';

// The Sthiva logo lives in @sthiva/web-core (packages/web-core/src/brand) so every site shows the same one
export function LogoMark({ size = 32, className = '', onDark = false }: { size?: number; className?: string; onDark?: boolean }) {
  return <SthivaMark size={size} onDark={onDark} partner className={className} />;
}

export function Logo({ tone = 'ink', href = '/' }: { tone?: 'ink' | 'sand'; href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center" aria-label="Sthiva Partner home">
      <SthivaLogo height={40} partner onDark={tone === 'sand'} />
    </Link>
  );
}
