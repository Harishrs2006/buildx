'use client';

import { useEffect, useRef } from 'react';

// Soft lime light that follows the pointer across its parent. Pointer devices only; it stays
// in its default spot on touch screens and for reduced-motion users.
export function Spotlight() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = parent.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    };
    parent.addEventListener('pointermove', onMove);
    return () => {
      cancelAnimationFrame(frame);
      parent.removeEventListener('pointermove', onMove);
    };
  }, []);

  return <div ref={ref} aria-hidden="true" className="spotlight pointer-events-none absolute inset-0" />;
}
