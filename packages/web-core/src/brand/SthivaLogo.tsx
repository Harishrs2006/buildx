// The Sthiva logo. The mark is an S built from two solid blocks with a lime beam through the
// middle: "sthira", steady and solid. The wordmark uses the display font (Bricolage Grotesque).
// Ink parts switch to sand on dark backgrounds; the beam is lime on dark and a deeper lime on light.

const INK = '#0B0C0A';
const SAND = '#F2EFE7';
const LIME = '#C8FF3D';
const LIME_ON_LIGHT = '#9BCB1F';
const GREY = '#8A8A82';

/** The S mark on a 48 x 48 grid (exported so icons and OG images draw the same shape). */
export const STHIVA_MARK_PATHS = {
  top: 'M14 7 H37 V14 H17 V20.5 H11 V10 Q11 7 14 7 Z',
  bottom: 'M31 27.5 H37 V38 Q37 41 34 41 H11 V34 H31 Z',
  beam: { x: 11, y: 20.5, width: 26, height: 7, rx: 1.5 },
};

function MarkShapes({ ink, beam }: { ink: string; beam: string }) {
  const b = STHIVA_MARK_PATHS.beam;
  return (
    <>
      <path d={STHIVA_MARK_PATHS.top} fill={ink} />
      <path d={STHIVA_MARK_PATHS.bottom} fill={ink} />
      <rect x={b.x} y={b.y} width={b.width} height={b.height} rx={b.rx} fill={beam} />
    </>
  );
}

/** Full logo: S mark plus the "sthiva" wordmark and (optionally) a tagline. `height` in px; width follows. */
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
  const ink = onDark ? SAND : INK;
  const vbH = tagline ? 64 : 48;
  const vbW = 184;
  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} height={height} width={(height * vbW) / vbH} role="img" aria-label="Sthiva" className={className}>
      <MarkShapes ink={ink} beam={onDark ? LIME : LIME_ON_LIGHT} />
      <text
        x="52"
        y="38"
        fill={ink}
        style={{ fontFamily: 'var(--font-display), "Bricolage Grotesque", system-ui, sans-serif', fontWeight: 800 }}
        fontSize="40"
        textLength="128"
        lengthAdjust="spacingAndGlyphs"
      >
        sthiva
      </text>
      {tagline && (
        <text
          x="12"
          y="60"
          fill={GREY}
          style={{ fontFamily: 'var(--font-mono), ui-monospace, monospace' }}
          fontSize="9"
          textLength="168"
          lengthAdjust="spacingAndGlyphs"
        >
          SOLID MATERIALS, STEADY SUPPLY
        </text>
      )}
    </svg>
  );
}

/** The S mark alone, square, for small places (icons, avatars). */
export function SthivaMark({
  size = 32,
  onDark = false,
  tile = false,
  className,
}: {
  size?: number;
  onDark?: boolean;
  /** Draw it on a rounded sand square, like an app icon */
  tile?: boolean;
  className?: string;
}) {
  const ink = onDark && !tile ? SAND : INK;
  const beam = onDark && !tile ? LIME : LIME_ON_LIGHT;
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" className={className}>
      {tile && <rect width="48" height="48" rx="12" fill={SAND} />}
      <MarkShapes ink={ink} beam={beam} />
    </svg>
  );
}
