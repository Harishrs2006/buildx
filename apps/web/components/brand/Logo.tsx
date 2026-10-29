import Link from 'next/link';
import { BuildXLogo, BuildXMark } from '@buildx/web-core';

// The BuildX logo lives in @buildx/web-core (packages/web-core/src/brand) so every site shows the same one
export function LogoMark({ size = 32, className = '', onDark = false }: { size?: number; className?: string; onDark?: boolean }) {
  return <BuildXMark size={size} onDark={onDark} className={className} />;
}

export function Logo({ tone = 'ink', href = '/' }: { tone?: 'ink' | 'sand'; href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center" aria-label="BuildX home">
      <BuildXLogo height={40} onDark={tone === 'sand'} />
    </Link>
  );
}
