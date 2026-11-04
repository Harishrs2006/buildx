// The Sthiva logo, drawn as vectors from the owner's artwork (docs/brand/sthiva-logo-original.png):
// a yellow rounded tile with an S made of two interlocking halves, the top in ink and the bottom in white.
// The wordmark "sthiva" sits next to the tile in the display font (Bricolage Grotesque).

export const STHIVA_COLORS = { yellow: '#F3B806', ink: '#1B1B19', white: '#FBFAF6' } as const;

/** The artwork on its original 1536 x 1536 canvas (exported so icons and OG images draw the same shape). */
export const STHIVA_MARK = {
  viewBox: '0 0 1536 1536',
  tileRadius: 340,
  top: 'M1128 318 H588 A270 270 0 0 0 588 858 H741 V678 H588 A90 90 0 0 1 588 498 H1128 Z',
  bottom: 'M796 678 H948 A270 270 0 0 1 948 1218 H408 V1038 H948 A90 90 0 0 0 948 858 H796 Z',
} as const;

function Tile({ x = 0, y = 0, size }: { x?: number; y?: number; size: number }) {
  return (
    <svg x={x} y={y} width={size} height={size} viewBox={STHIVA_MARK.viewBox}>
      <rect width="1536" height="1536" rx={STHIVA_MARK.tileRadius} fill={STHIVA_COLORS.yellow} />
      <path d={STHIVA_MARK.top} fill={STHIVA_COLORS.ink} />
      <path d={STHIVA_MARK.bottom} fill={STHIVA_COLORS.white} />
    </svg>
  );
}

/** Full logo: the tile plus the "sthiva" wordmark and (optionally) a tagline. `height` in px; width follows. */
export function SthivaLogo({
  height = 36,
  onDark = false,
  tagline = false,
  className,
}: {
  height?: number;
  onDark?: boolean;
  tagline?: boolean;
  className?: string;
}) {
  const text = onDark ? '#F2EFE7' : '#0B0C0A';
  const vbH = tagline ? 64 : 48;
  const vbW = 184;
  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} height={height} width={(height * vbW) / vbH} role="img" aria-label="Sthiva" className={className}>
      <Tile size={48} />
      <text
        x="56"
        y="37"
        fill={text}
        style={{ fontFamily: 'var(--font-display), "Bricolage Grotesque", system-ui, sans-serif', fontWeight: 800 }}
        fontSize="40"
        textLength="124"
        lengthAdjust="spacingAndGlyphs"
      >
        sthiva
      </text>
      {tagline && (
        <text
          x="2"
          y="61"
          fill="#8A8A82"
          style={{ fontFamily: 'var(--font-mono), ui-monospace, monospace' }}
          fontSize="9"
          textLength="178"
          lengthAdjust="spacingAndGlyphs"
        >
          SOLID MATERIALS, STEADY SUPPLY
        </text>
      )}
    </svg>
  );
}

/** The tile alone, square, for small places (icons, avatars). It reads on light and dark backgrounds alike. */
export function SthivaMark({
  size = 32,
  className,
}: {
  size?: number;
  /** Kept for older callers: the tile looks the same on any background */
  onDark?: boolean;
  tile?: boolean;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" className={className}>
      <Tile size={48} />
    </svg>
  );
}
