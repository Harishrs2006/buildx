'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { LogoMark } from '@/components/brand/Logo';
import { CHAPTERS, LAST_CHAPTER, resolveChapterLinks, type Chapter } from './chapters';
import { useMotionTier, type MotionTier } from './motionTier';
import { SCROLL_TUNING, useChapterScroll, useSmoothScroll } from './useChapterScroll';

const SiteScene = dynamic(() => import('./SiteScene'), { ssr: false });

type Categories = { slug: string; name: string }[] | null;

// Pre-rendered stills of the 3D scene (public/cinematic). Used as the hero poster while
// WebGL loads, and as the whole story on phones, low-power devices and reduced motion.
export function posterSrc(i: number, portrait = false) {
  return `/cinematic/chapter-${i}${portrait ? '-portrait' : ''}.webp`;
}

function Poster({ i, priority = false, className = '', style }: { i: number; priority?: boolean; className?: string; style?: React.CSSProperties }) {
  return (
    <picture>
      <source media="(max-aspect-ratio: 4/5)" srcSet={posterSrc(i, true)} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={posterSrc(i)}
        alt=""
        aria-hidden="true"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        className={`absolute inset-0 h-full w-full object-cover ${className}`}
        style={style}
      />
    </picture>
  );
}

function ChapterButtons({ chapter, categories, onFocusChapter }: { chapter: Chapter; categories: Categories; onFocusChapter?: () => void }) {
  const links = resolveChapterLinks(chapter, categories);
  if (links.length === 0) return null;
  return (
    <div className="mt-7 flex flex-wrap gap-3">
      {links.map((l, k) => (
        <Link
          key={l.slug}
          href={`/category/${l.slug}`}
          onFocus={onFocusChapter}
          className={k === 0 ? 'btn-lime group' : 'btn-ghost-dark'}
        >
          {l.name}
          {k === 0 && (
            <span className="material-symbols-outlined text-[20px] transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">
              arrow_forward
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}

function FinalButtons({ onFocusChapter }: { onFocusChapter?: () => void }) {
  return (
    <div className="mt-8 flex flex-wrap gap-3">
      <a href="#delivery" onFocus={onFocusChapter} className="btn-lime group">
        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">pin_drop</span>
        Check delivery to your PIN code
      </a>
      <a href="#categories" onFocus={onFocusChapter} className="btn-ghost-dark">
        Start ordering
      </a>
    </div>
  );
}

function HeroContent({ onFocusChapter, onNext }: { onFocusChapter?: () => void; onNext?: () => void }) {
  const hero = CHAPTERS[0];
  return (
    <div className="flex h-full flex-col items-center justify-center px-5 pb-24 pt-[var(--header-h)] text-center">
      <div className="flex animate-fade-up items-center gap-3">
        <LogoMark size={52} onDark />
        <span className="font-display text-[44px] font-bold tracking-tightest text-sand sm:text-[56px]">BuildX</span>
      </div>
      <h1 className="mt-6 max-w-5xl font-display text-[clamp(2.75rem,7.6vw,6.5rem)] font-bold leading-[0.92] tracking-tightest text-white text-balance">
        <span className="block animate-fade-up" style={{ animationDelay: '120ms' }}>{hero.title}</span>
        <span className="block animate-fade-up font-serif font-normal italic tracking-[-0.02em] text-lime" style={{ animationDelay: '240ms' }}>
          {hero.accent}
        </span>
      </h1>
      <p className="mt-6 max-w-xl animate-fade-up text-pretty text-[17px] leading-relaxed text-white/80 sm:text-[19px]" style={{ animationDelay: '380ms' }}>
        {hero.body}
      </p>
      <div className="mt-9 flex animate-fade-up flex-wrap justify-center gap-3" style={{ animationDelay: '520ms' }}>
        <a href="#delivery" onFocus={onFocusChapter} className="btn-lime group h-14 px-7 text-[16px]">
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">pin_drop</span>
          Check delivery to your PIN code
        </a>
        <a href="#categories" onFocus={onFocusChapter} className="btn-ghost-dark h-14 px-7 text-[16px] backdrop-blur-md">
          Browse materials
        </a>
      </div>
      {onNext && (
        <button
          type="button"
          onClick={onNext}
          className="absolute bottom-7 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-[14px] font-medium text-white/80 transition-colors hover:text-white"
        >
          Scroll down
          <span className="material-symbols-outlined animate-bounce text-[22px]" aria-hidden="true">keyboard_double_arrow_down</span>
        </button>
      )}
    </div>
  );
}

function ChapterContent({ chapter, index, categories, onFocusChapter }: { chapter: Chapter; index: number; categories: Categories; onFocusChapter?: () => void }) {
  return (
    <div className="container-x flex h-full flex-col justify-end pb-36 pt-[var(--header-h)] md:pb-28 lg:justify-center lg:pb-0">
      <div className="max-w-xl">
        <p className="eyebrow flex items-center gap-3 text-lime">
          <span className="font-mono text-white/60">{String(index).padStart(2, '0')}</span>
          <span className="h-px w-8 bg-lime/60" aria-hidden="true" />
          {chapter.eyebrow}
        </p>
        <h2 className="mt-4 font-display text-[clamp(2.5rem,6vw,5.25rem)] font-bold leading-[0.93] tracking-tightest text-white text-balance [text-shadow:0_2px_30px_rgba(0,0,0,0.35)]">
          {chapter.title} <span className="font-serif font-normal italic tracking-[-0.02em]">{chapter.accent}</span>
        </h2>
        <p className="mt-5 max-w-md text-[17px] leading-relaxed text-white/80">{chapter.body}</p>
        {index === LAST_CHAPTER ? (
          <FinalButtons onFocusChapter={onFocusChapter} />
        ) : (
          <ChapterButtons chapter={chapter} categories={categories} onFocusChapter={onFocusChapter} />
        )}
      </div>
    </div>
  );
}

// Reduced motion: no pinning, no scrubbing. Each chapter is a plain full-height section.
function StaticStory({ categories }: { categories: Categories }) {
  return (
    <section id="story" aria-label="What you can order on BuildX" className="on-ink bg-ink">
      {CHAPTERS.map((chapter, i) => (
        <div key={chapter.id} className="relative isolate min-h-[100svh] overflow-hidden">
          <Poster i={i} priority={i === 0} />
          <div className={`absolute inset-0 bg-ink ${i === 0 ? 'opacity-[0.78]' : 'opacity-40'}`} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 hidden w-[55%] bg-[linear-gradient(90deg,rgba(11,12,10,0.55),transparent)] lg:block" aria-hidden="true" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,12,10,0.55)_0%,rgba(11,12,10,0.25)_40%,rgba(11,12,10,0.85)_100%)]" aria-hidden="true" />
          <div className="relative">
            {i === 0 ? (
              <div className="h-[100svh] min-h-[640px]">
                <HeroContent />
              </div>
            ) : (
              <div className="h-[100svh] min-h-[640px]">
                <ChapterContent chapter={chapter} index={i} categories={categories} />
              </div>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}

function PinnedStory({ tier, categories }: { tier: Exclude<MotionTier, 'static'>; categories: Categories }) {
  const container = useRef<HTMLElement>(null);
  const overlays = useRef<(HTMLDivElement | null)[]>([]);
  const stills = useRef<(HTMLDivElement | null)[]>([]);
  const rail = useRef<(HTMLButtonElement | null)[]>([]);
  const bar = useRef<HTMLDivElement>(null);
  const dim = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const [sceneReady, setSceneReady] = useState(false);
  const lastActive = useRef(-1);

  useSmoothScroll(true);

  const { progress, scrollToChapter } = useChapterScroll(container, CHAPTERS.length, (p) => {
    overlays.current.forEach((el, i) => {
      if (!el) return;
      const d = p - i;
      const w = Math.max(0, 1 - Math.abs(d) * 1.7);
      el.style.opacity = String(w);
      el.style.visibility = w <= 0.001 ? 'hidden' : 'visible';
      el.style.pointerEvents = w > 0.6 ? 'auto' : 'none';
      el.style.transform = `translate3d(0, ${(-d * 90).toFixed(1)}px, 0) rotateX(${(d * 16).toFixed(2)}deg) scale(${(0.94 + 0.06 * w).toFixed(3)})`;
    });
    stills.current.forEach((el, i) => {
      if (!el) return;
      const d = p - i;
      const w = Math.max(0, 1 - Math.abs(d));
      el.style.opacity = String(Math.min(1, w * 1.4));
      el.style.visibility = w <= 0.001 ? 'hidden' : 'visible';
      el.style.transform = `perspective(1200px) translate3d(${(-d * 40).toFixed(1)}px, 0, ${(-Math.abs(d) * 220).toFixed(1)}px) rotateY(${(d * -7).toFixed(2)}deg) scale(${(1.08 - 0.08 * w + Math.abs(d) * 0.05).toFixed(3)})`;
    });
    if (bar.current) bar.current.style.transform = `scaleY(${(p / LAST_CHAPTER).toFixed(4)})`;
    // darkest on the hero (centred white type), lighter once the side-aligned chapters start
    if (dim.current) dim.current.style.opacity = String(0.38 + 0.4 * Math.max(0, 1 - p * 1.4));
    const active = Math.round(p);
    if (active !== lastActive.current) {
      lastActive.current = active;
      rail.current.forEach((b, i) => {
        if (!b) return;
        if (i === active) b.setAttribute('aria-current', 'step');
        else b.removeAttribute('aria-current');
      });
    }
  });

  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: '200px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      id="story"
      ref={container}
      aria-label="What you can order on BuildX"
      className="on-ink relative bg-ink"
      style={{ height: `${CHAPTERS.length * SCROLL_TUNING.vhPerChapter * 100}svh` }}
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {/* stage */}
        <div className="absolute inset-0" aria-hidden="true">
          {tier === 'full' ? (
            <>
              <div className={`absolute inset-0 transition-opacity duration-1000 ${sceneReady ? 'opacity-0' : 'opacity-100'}`}>
                <Poster i={0} priority />
              </div>
              <SiteScene progress={progress} active={inView} onReady={() => setSceneReady(true)} />
            </>
          ) : (
            <div className="absolute inset-0 [perspective:1200px]">
              {CHAPTERS.map((c, i) => (
                <div key={c.id} ref={(el) => { stills.current[i] = el; }} className="absolute inset-0 will-change-transform" style={{ opacity: i === 0 ? 1 : 0 }}>
                  <Poster i={i} priority={i === 0} />
                </div>
              ))}
            </div>
          )}
          {/* readability: overall dim, top band for the header, heavier towards the bottom, soft vignette */}
          <div ref={dim} className="pointer-events-none absolute inset-0 bg-ink" style={{ opacity: 0.78 }} />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(11,12,10,0.6)_0%,rgba(11,12,10,0)_22%,rgba(11,12,10,0)_45%,rgba(11,12,10,0.78)_100%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(11,12,10,0.55)_100%)]" />
          <div className="grain pointer-events-none absolute inset-0" />
          <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[55%] bg-[linear-gradient(90deg,rgba(11,12,10,0.55),transparent)] lg:block" />
        </div>

        {/* chapter text, real HTML above the canvas */}
        <div className="absolute inset-0 [perspective:1000px]">
          {CHAPTERS.map((chapter, i) => (
            <div
              key={chapter.id}
              ref={(el) => { overlays.current[i] = el; }}
              className="absolute inset-0 will-change-transform"
              style={{ opacity: i === 0 ? 1 : 0, visibility: i === 0 ? 'visible' : 'hidden' }}
            >
              {i === 0 ? (
                <HeroContent onFocusChapter={() => scrollToChapter(0)} onNext={() => scrollToChapter(1)} />
              ) : (
                <ChapterContent chapter={chapter} index={i} categories={categories} onFocusChapter={() => scrollToChapter(i)} />
              )}
            </div>
          ))}
        </div>

        {/* chapter rail */}
        <nav aria-label="Story chapters" className="absolute right-4 top-1/2 hidden -translate-y-1/2 md:block lg:right-8">
          <div className="relative flex flex-col gap-1">
            <div className="absolute bottom-3 left-[7px] top-3 w-px bg-white/15" aria-hidden="true">
              <div ref={bar} className="h-full w-px origin-top bg-lime" style={{ transform: 'scaleY(0)' }} />
            </div>
            {CHAPTERS.map((c, i) => (
              <button
                key={c.id}
                ref={(b) => { rail.current[i] = b; }}
                type="button"
                onClick={() => scrollToChapter(i)}
                aria-current={i === 0 ? 'step' : undefined}
                className="group relative flex h-9 items-center gap-3 pl-0 text-left"
              >
                <span className="relative z-10 h-[15px] w-[15px] rounded-full border border-white/40 bg-ink transition-[background-color,border-color,transform] duration-300 group-hover:border-lime group-aria-[current=step]:scale-110 group-aria-[current=step]:border-lime group-aria-[current=step]:bg-lime" />
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/0 transition-colors duration-300 group-hover:text-white/80 group-focus-visible:text-white/80 group-aria-[current=step]:text-white/80">
                  {i === 0 ? 'Start' : c.eyebrow}
                </span>
              </button>
            ))}
          </div>
        </nav>

        <a
          href="#delivery"
          className="absolute bottom-6 right-5 rounded-full px-3 py-2 text-[13px] font-medium text-white/60 underline-offset-4 transition-colors hover:text-white hover:underline focus-visible:text-white"
        >
          Skip the story
        </a>
      </div>
    </section>
  );
}

export function CinematicLanding({ categories }: { categories: Categories }) {
  const tier = useMotionTier();
  // Before the tier is known (first paint), show the hero still with real text: no layout shift
  if (tier === null) {
    return (
      <section id="story" aria-label="What you can order on BuildX" className="on-ink relative h-[100svh] overflow-hidden bg-ink">
        <Poster i={0} priority />
        <div className="absolute inset-0 bg-ink opacity-[0.78]" aria-hidden="true" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,12,10,0.6)_0%,rgba(11,12,10,0)_22%,rgba(11,12,10,0)_45%,rgba(11,12,10,0.78)_100%)]" aria-hidden="true" />
        <div className="relative h-full">
          <HeroContent />
        </div>
      </section>
    );
  }
  if (tier === 'static') return <StaticStory categories={categories} />;
  return <PinnedStory tier={tier} categories={categories} />;
}

// Development-only poster renderer: /?still=<chapter> shows just the 3D stage frozen at that chapter
export function StillStage({ chapter }: { chapter: number }) {
  const progress = useRef({ current: chapter }).current;
  return (
    <div className="fixed inset-0 bg-ink">
      <SiteScene progress={progress} still={chapter} />
    </div>
  );
}
