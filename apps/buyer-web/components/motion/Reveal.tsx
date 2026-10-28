'use client';

import { useEffect, useRef, type ReactNode, type CSSProperties } from 'react';

// Fades + lifts its child into place the first time it scrolls into view. The hidden starting
// state lives in globals.css behind `.js`, and reduced-motion users get it instantly.
export function Reveal({
  as: Tag = 'div',
  delay = 0,
  className,
  children,
}: {
  as?: 'div' | 'li' | 'section';
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement & HTMLLIElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        // Also reveal anything already above the viewport (fast scroll, anchor jump, print)
        if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
          el.classList.add('is-visible');
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref} data-reveal="" className={className} style={{ '--reveal-delay': `${delay}ms` } as CSSProperties}>
      {children}
    </Tag>
  );
}

// Headline whose lines slide up from behind a mask, staggered.
export function SplitLines({ lines, className, stagger = 90, start = 0 }: { lines: ReactNode[]; className?: string; stagger?: number; start?: number }) {
  return (
    <span className={className}>
      {lines.map((line, i) => (
        <span key={i} className="line-mask">
          <span style={{ '--d': `${start + i * stagger}ms` } as CSSProperties}>{line}</span>
        </span>
      ))}
    </span>
  );
}
