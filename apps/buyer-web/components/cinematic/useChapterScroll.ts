'use client';

import { useCallback, useEffect, useRef, type RefObject } from 'react';
import Lenis from 'lenis';

// Tuning knobs for the pinned story
export const SCROLL_TUNING = {
  // viewport heights of scrolling per chapter step
  vhPerChapter: 1.1,
  // 0..1, how quickly the rendered progress catches up with the real scroll position each frame
  damping: 0.14,
};

export type StoryProgress = { current: number };

// Maps the scroll position inside a tall container to story progress 0..(count - 1).
// Progress lives in a ref and `onFrame` runs inside requestAnimationFrame, so per-frame
// updates (3D camera, overlay opacity) never re-render React.
export function useChapterScroll(
  containerRef: RefObject<HTMLElement | null>,
  count: number,
  onFrame: (progress: number) => void,
  enabled = true
) {
  const progress = useRef<StoryProgress>({ current: 0 }).current;
  const frameCb = useRef(onFrame);
  frameCb.current = onFrame;

  const target = useCallback(() => {
    const el = containerRef.current;
    if (!el) return 0;
    const scrollable = el.offsetHeight - window.innerHeight;
    if (scrollable <= 0) return 0;
    const t = Math.min(1, Math.max(0, -el.getBoundingClientRect().top / scrollable));
    return t * (count - 1);
  }, [containerRef, count]);

  // The loop only runs while progress is catching up with a scroll, then goes idle,
  // so a page sitting still costs no main-thread time.
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    progress.current = target();
    frameCb.current(progress.current);
    const tick = () => {
      const goal = target();
      const next = progress.current + (goal - progress.current) * SCROLL_TUNING.damping;
      const settled = Math.abs(goal - next) < 0.0005;
      progress.current = settled ? goal : next;
      frameCb.current(progress.current);
      raf = settled ? 0 : requestAnimationFrame(tick);
    };
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    window.addEventListener('scroll', wake, { passive: true });
    window.addEventListener('resize', wake);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', wake);
      window.removeEventListener('resize', wake);
    };
  }, [enabled, target, progress]);

  // Scroll the window so chapter i is centred in the pinned stage
  const scrollToChapter = useCallback(
    (i: number, smooth = true) => {
      const el = containerRef.current;
      if (!el) return;
      const scrollable = el.offsetHeight - window.innerHeight;
      const top = el.getBoundingClientRect().top + window.scrollY + (scrollable * i) / (count - 1);
      window.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
    },
    [containerRef, count]
  );

  return { progress, scrollToChapter };
}

// Lenis smooth scrolling for the landing page (native scroll underneath, so sticky and
// keyboard scrolling keep working). Touch scrolling stays native.
export function useSmoothScroll(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const lenis = new Lenis({ duration: 1.15, anchors: { offset: -80 } });
    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, [enabled]);
}
