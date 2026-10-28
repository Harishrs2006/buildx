'use client';

import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import type { StoryProgress } from './useChapterScroll';
import { StoryContext } from './scene/parts';
import { Building, CameraRig, City, Crane, Environment, Ground } from './scene/World';
import { Bathroom, BrickWorks, ConcreteMixer, LightStrings, PaintWall, SteelTruck, Stockyard, TileRoom } from './scene/Stations';

// The whole construction site as one WebGL scene. Loaded lazily (next/dynamic, ssr: false)
// and only on devices that get the "full" motion tier.
export default function SiteScene({
  progress,
  still = null,
  active = true,
  onReady,
}: {
  progress: StoryProgress;
  still?: number | null;
  active?: boolean;
  onReady?: () => void;
}) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      frameloop={active ? 'always' : 'never'}
      camera={{ fov: 38, near: 0.5, far: 900, position: [34, 24, 40] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
        requestAnimationFrame(() => onReady?.());
      }}
      aria-hidden="true"
    >
      <StoryContext.Provider value={{ progress, still, high: true }}>
        <CameraRig />
        <Environment />
        <Ground />
        <Building />
        <Crane />
        <City />
        <Stockyard />
        <SteelTruck />
        <ConcreteMixer />
        <BrickWorks />
        <TileRoom />
        <PaintWall />
        <LightStrings />
        <Bathroom />
      </StoryContext.Provider>
    </Canvas>
  );
}
