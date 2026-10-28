import type { CSSProperties } from 'react';

// Isometric box: (x, y) is the top-back corner, a = length along the right axis, b = depth along
// the left axis, h = height. Returns the three visible faces as SVG point lists.
function box(x: number, y: number, a: number, b: number, h: number) {
  const p = (px: number, py: number) => `${px.toFixed(1)},${py.toFixed(1)}`;
  const r = [x + a, y + a / 2];
  const l = [x - b, y + b / 2];
  const f = [x + a - b, y + (a + b) / 2];
  return {
    top: [p(x, y), p(r[0], r[1]), p(f[0], f[1]), p(l[0], l[1])].join(' '),
    left: [p(l[0], l[1]), p(f[0], f[1]), p(f[0], f[1] + h), p(l[0], l[1] + h)].join(' '),
    right: [p(f[0], f[1]), p(r[0], r[1]), p(r[0], r[1] + h), p(f[0], f[1] + h)].join(' '),
  };
}

type Block = { x: number; y: number; a: number; b: number; h: number; tone: 'lime' | 'sand' | 'ink' | 'cobalt'; delay: number };

const TONES = {
  lime: { top: '#DBFF7A', left: '#C8FF3D', right: '#A6E01C' },
  sand: { top: '#FAF8F3', left: '#E8E4D9', right: '#CFC9B9' },
  ink: { top: '#3A3D35', left: '#24261F', right: '#171814' },
  cobalt: { top: '#5A80FF', left: '#2457FF', right: '#1A43CC' },
} as const;

// A tidy stack: blocks sit on a slab (origin 250,210, 160x160 footprint). Positions are in
// slab grid units (u right, v left, z up) and converted to screen space; listed back-to-front.
const SLAB = { x: 250, y: 210 };
function onSlab(u: number, v: number, z: number, a: number, b: number, h: number, tone: Block['tone'], delay: number): Block {
  return { x: SLAB.x + u - v, y: SLAB.y + (u + v) / 2 - z - h, a, b, h, tone, delay };
}

const BLOCKS: Block[] = [
  { x: SLAB.x, y: SLAB.y, a: 160, b: 160, h: 36, tone: 'sand', delay: 0 },
  onSlab(10, 10, 0, 60, 60, 60, 'cobalt', 250),
  onSlab(0, 22, 60, 82, 30, 18, 'lime', 900),
  onSlab(90, 10, 0, 60, 60, 96, 'ink', 400),
  onSlab(10, 90, 0, 60, 60, 48, 'sand', 550),
  onSlab(82, 96, 0, 72, 52, 28, 'lime', 700),
];

export function HeroVisual() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[560px]" aria-hidden="true">
      {/* Glow */}
      <div className="absolute inset-[12%] rounded-full bg-lime/20 blur-[90px]" />

      {/* Orbit ring with rotating label */}
      <svg viewBox="0 0 500 500" className="absolute inset-0 h-full w-full animate-spin-slow">
        <defs>
          <path id="orbit" d="M250,250 m-218,0 a218,218 0 1,1 436,0 a218,218 0 1,1 -436,0" />
        </defs>
        <circle cx="250" cy="250" r="232" fill="none" stroke="rgba(242,239,231,0.08)" strokeDasharray="2 8" />
        <text fill="rgba(242,239,231,0.35)" fontSize="11" letterSpacing="6" fontFamily="var(--font-mono)">
          <textPath href="#orbit">
            CEMENT · STEEL · SAND · BRICKS · AGGREGATES · TILES · PAINT · PLUMBING · ELECTRICALS · TOOLS ·
          </textPath>
        </text>
      </svg>

      {/* The stack */}
      <svg viewBox="0 0 500 500" className="absolute inset-0 h-full w-full">
        <ellipse cx="250" cy="425" rx="175" ry="34" fill="rgba(0,0,0,0.45)" style={{ filter: 'blur(14px)' }} />
        <g className="hero-bob">
        {BLOCKS.map((b, i) => {
          const f = box(b.x, b.y, b.a, b.b, b.h);
          const t = TONES[b.tone];
          return (
            <g key={i} className="hero-float" style={{ '--float-delay': `${b.delay}ms` } as CSSProperties}>
              <polygon points={f.left} fill={t.left} />
              <polygon points={f.right} fill={t.right} />
              <polygon points={f.top} fill={t.top} />
            </g>
          );
        })}
        </g>
      </svg>

      {/* Floating chips: describe what the product does, never fake data */}
      <Chip className="left-[-2%] top-[18%]" icon="verified" label="Verified suppliers" delay={0} />
      <Chip className="right-[-4%] top-[44%]" icon="pin_drop" label="Delivery checked by PIN" delay={500} accent />
      <Chip className="bottom-[12%] left-[6%]" icon="payments" label="Cash on delivery" delay={1000} />
    </div>
  );
}

function Chip({ className, icon, label, delay, accent }: { className: string; icon: string; label: string; delay: number; accent?: boolean }) {
  return (
    <div
      className={`hero-chip absolute flex items-center gap-2 rounded-full border px-3.5 py-2 text-[12px] font-semibold shadow-[0_12px_40px_-10px_rgba(0,0,0,0.6)] backdrop-blur-md sm:text-[13px] ${
        accent ? 'border-lime/40 bg-lime text-ink' : 'border-white/10 bg-white/[0.08] text-sand'
      } ${className}`}
      style={{ '--float-delay': `${delay}ms` } as CSSProperties}
    >
      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
        {icon}
      </span>
      {label}
    </div>
  );
}
