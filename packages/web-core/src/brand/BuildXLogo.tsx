// The BuildX logo, drawn as vectors from the owner's artwork: a house roof with a window, the
// roof's rafter running down into the X of BUILDX, and the line EXCELLENCE IN BUILDING.
// Black parts switch to sand on dark backgrounds; the grey stays grey.

const INK = '#0B0C0A';
const SAND = '#F2EFE7';
const GREY = '#9E9E9E';

function Roof({ dark }: { dark: string }) {
  return (
    <>
      <g fill={dark}>
        <path d="M140 650 L420 405 L850 370 L570 650 Z" />
        <path d="M850 370 L860 370 L1328 866 L1314 866 Z" />
      </g>
      <g fill={GREY}>
        <path d="M828 418 L856 400 L1294 866 L1256 866 Z" />
        <path d="M1228 686 H1306 L1086 930 H1008 Z" />
        <path d="M782 527h46v46h-46zM836 527h46v46h-46zM782 581h46v46h-46zM836 581h46v46h-46z" />
      </g>
    </>
  );
}

/** Full logo: roof, BUILDX wordmark and (optionally) the tagline. `height` in px; width follows. */
export function BuildXLogo({
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
  const dark = onDark ? SAND : INK;
  return (
    <svg
      viewBox="120 350 1225 600"
      height={height}
      width={(height * 1225) / 600}
      role="img"
      aria-label="BuildX"
      className={className}
    >
      <Roof dark={dark} />
      <g fill={dark} fillRule="evenodd">
        <path d="M140 683 H288 Q330 683 330 722 V744 Q330 762 314 775 Q330 788 330 806 V829 Q330 868 288 868 H140 Z M195 724 V756 H266 Q274 756 274 748 V732 Q274 724 266 724 Z M195 795 V827 H266 Q274 827 274 819 V803 Q274 795 266 795 Z" />
        <path d="M350 683 H405 V818 H480 V683 H535 V826 Q535 868 492 868 H393 Q350 868 350 826 Z" />
        <path d="M555 683 H610 V868 H555 Z" />
        <path d="M630 683 H685 V818 H800 V868 H630 Z" />
        <path d="M820 683 H966 Q1010 683 1010 727 V824 Q1010 868 966 868 H820 Z M875 731 V820 H946 Q955 820 955 811 V740 Q955 731 946 731 Z" />
      </g>
      {tagline && (
        <text x="145" y="929" fill={GREY} fontFamily="Arial, Helvetica, sans-serif" fontSize="44" textLength="850" lengthAdjust="spacingAndGlyphs">
          EXCELLENCE IN BUILDING
        </text>
      )}
    </svg>
  );
}

/** The roof-and-X symbol alone, square, for small places (icons, avatars). */
export function BuildXMark({
  size = 32,
  onDark = false,
  tile = false,
  className,
}: {
  size?: number;
  onDark?: boolean;
  /** Draw it on a rounded sand (or ink, on dark) square, like an app icon */
  tile?: boolean;
  className?: string;
}) {
  const dark = onDark && !tile ? SAND : INK;
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" className={className}>
      {tile && <rect width="48" height="48" rx="12" fill={SAND} />}
      <svg x="3" y="3" width="42" height="42" viewBox="135 12 1200 1200">
        <Roof dark={dark} />
      </svg>
    </svg>
  );
}
