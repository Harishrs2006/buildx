'use client';

import { useEffect, useState } from 'react';

// full   = WebGL 3D scene pinned and scrubbed by scroll (capable desktops/laptops)
// lite   = pinned story over pre-rendered stills with CSS 3D parallax (phones, low-power devices)
// static = no pinning or scrubbing, chapters stacked with simple fades (prefers-reduced-motion)
export type MotionTier = 'full' | 'lite' | 'static';

export type DeviceSignals = {
  reducedMotion: boolean;
  coarsePointer: boolean;
  viewportWidth: number;
  cores?: number;
  memoryGb?: number;
  saveData?: boolean;
  webgl: boolean;
};

export function pickMotionTier(d: DeviceSignals): MotionTier {
  if (d.reducedMotion) return 'static';
  if (!d.webgl || d.saveData) return 'lite';
  if (d.coarsePointer || d.viewportWidth < 900) return 'lite';
  if (d.cores !== undefined && d.cores < 4) return 'lite';
  if (d.memoryGb !== undefined && d.memoryGb < 4) return 'lite';
  return 'full';
}

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export function readDeviceSignals(): DeviceSignals {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  return {
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    coarsePointer: window.matchMedia('(pointer: coarse)').matches,
    viewportWidth: window.innerWidth,
    cores: nav.hardwareConcurrency,
    memoryGb: nav.deviceMemory,
    saveData: nav.connection?.saveData,
    webgl: hasWebGL(),
  };
}

// null until the first client render, so server HTML and hydration always match
export function useMotionTier(): MotionTier | null {
  const [tier, setTier] = useState<MotionTier | null>(null);
  useEffect(() => {
    const update = () => setTier(pickMotionTier(readDeviceSignals()));
    update();
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return tier;
}
