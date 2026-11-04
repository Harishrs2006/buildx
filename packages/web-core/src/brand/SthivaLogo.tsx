import { useId, type ReactElement } from 'react';
import { BRAND_COLORS as C, MARK, WORD_PARTNER, WORD_STHIVA } from './paths';

// The Sthiva brand system (docs/brand). One mark for both sides of the marketplace:
//   Sthiva          (buyers):   ink and yellow halves, ink wordmark on light, white on dark.
//   Sthiva Partner  (sellers):  same mark, white and yellow halves on ink, "PARTNER" in yellow.

/** The hexagon S mark. `left` / `right` colour the two halves; the gap between them is transparent. */
function Mark({ left, right, size, x = 0, y = 0 }: { left: string; right: string; size: number; x?: number; y?: number }) {
  const id = `sthiva-mask-${useId().replace(/:/g, '')}`;
  return (
    <svg x={x} y={y} width={size} height={size} viewBox={MARK.viewBox} aria-hidden="true">
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="1536" height="1536">
          <polygon points={MARK.hex} fill="#fff" stroke="#fff" strokeWidth={MARK.cornerRound} strokeLinejoin="round" />
          <path d={MARK.curve} fill="none" stroke="#000" strokeWidth={MARK.gap} />
        </mask>
      </defs>
      <g mask={`url(#${id})`}>
        <rect x="0" y="0" width="1536" height="1536" fill={right} />
        <path d={MARK.left} fill={left} />
      </g>
    </svg>
  );
}

const H = 200; // mark size in logo units
const GAP = 56;

/** Full horizontal logo. `height` in px; width follows. `partner` gives the seller (Sthiva Partner) lockup. */
export function SthivaLogo({
  height = 36,
  onDark = false,
  partner = false,
  className,
}: {
  height?: number;
  onDark?: boolean;
  partner?: boolean;
  /** Kept for older callers; the logo no longer carries a tagline */
  tagline?: boolean;
  className?: string;
}) {
  const word = onDark ? C.white : C.ink;
  const markLeft = onDark ? C.white : C.ink;
  let width: number;
  let text: ReactElement;
  if (!partner) {
    const s = 1.5;
    const baseline = (H + WORD_STHIVA.capHeight * s) / 2;
    width = H + GAP + WORD_STHIVA.width * s;
    text = <path d={WORD_STHIVA.d} fill={word} transform={`translate(${H + GAP} ${baseline}) scale(${s})`} />;
  } else {
    const s1 = 1.18;
    const s2 = 0.6;
    const lineGap = 34;
    const top = (H - (WORD_STHIVA.capHeight * s1 + lineGap + WORD_PARTNER.capHeight * s2)) / 2;
    const b1 = top + WORD_STHIVA.capHeight * s1;
    const b2 = b1 + lineGap + WORD_PARTNER.capHeight * s2;
    width = H + GAP + Math.max(WORD_STHIVA.width * s1, WORD_PARTNER.width * s2);
    text = (
      <>
        <path d={WORD_STHIVA.d} fill={word} transform={`translate(${H + GAP} ${b1}) scale(${s1})`} />
        <path d={WORD_PARTNER.d} fill={onDark ? C.yellow : C.yellowDeep} transform={`translate(${H + GAP} ${b2}) scale(${s2})`} />
      </>
    );
  }
  return (
    <svg
      viewBox={`0 0 ${width} ${H}`}
      height={height}
      width={(height * width) / H}
      role="img"
      aria-label={partner ? 'Sthiva Partner' : 'Sthiva'}
      className={className}
    >
      <Mark left={markLeft} right={C.yellow} size={H} />
      {text}
    </svg>
  );
}

/** The mark alone, for small places. `tile` draws it like the app icon (yellow tile for buyers, ink for partners). */
export function SthivaMark({
  size = 32,
  onDark = false,
  partner = false,
  tile = false,
  className,
}: {
  size?: number;
  onDark?: boolean;
  partner?: boolean;
  tile?: boolean;
  className?: string;
}) {
  if (tile) {
    return (
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" className={className}>
        <rect width="48" height="48" rx="11" fill={partner ? C.ink : C.yellow} />
        <Mark left={partner ? C.white : C.ink} right={partner ? C.yellow : C.white} size={36} x={6} y={6} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" className={className}>
      <Mark left={onDark ? C.white : C.ink} right={C.yellow} size={48} />
    </svg>
  );
}
