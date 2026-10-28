'use client';

import { createContext, useContext, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeElements } from '@react-three/fiber';
import * as THREE from 'three';
import type { StoryProgress } from '../useChapterScroll';

export const C = {
  ink: '#0B0C0A',
  ink3: '#1D1F1A',
  sand: '#D9CFB6',
  pad: '#B8AC90',
  concrete: '#C4BEB0',
  concreteDark: '#9C978B',
  lime: '#C8FF3D',
  cobalt: '#2457FF',
  brick: '#B4532F',
  steel: '#7A4A2E',
  wood: '#C79A5E',
  skin: '#8D5A3B',
  gold: '#C9A24A',
  marble: '#F3EFE6',
  darkMarble: '#23241F',
};

export type Story = { progress: StoryProgress; still: number | null; high: boolean };
export const StoryContext = createContext<Story | null>(null);

const STILL_TIME = 7.3;

// Story progress + animation time for this frame. Still mode freezes both (for poster renders).
export function useStory() {
  const story = useContext(StoryContext);
  if (!story) throw new Error('useStory must be used inside <StoryContext>');
  return {
    high: story.high,
    read: (elapsed: number) =>
      story.still !== null ? { p: story.still, t: STILL_TIME } : { p: story.progress.current, t: elapsed },
  };
}

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const easeOut = (v: number) => 1 - Math.pow(1 - clamp01(v), 3);
export const easeInOut = (v: number) => {
  const x = clamp01(v);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

// A site worker: boots, trousers, hi-vis vest with a reflective band, hard hat.
// `pose` drives the arm swing; `phase` desynchronises workers.
export function Worker({
  pose = 'idle',
  phase = 0,
  hat = C.lime,
  ...props
}: { pose?: 'idle' | 'throw' | 'catch' | 'paint' | 'work'; phase?: number; hat?: string } & ThreeElements['group']) {
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const { read } = useStory();

  useFrame((state) => {
    const { t } = read(state.clock.elapsedTime);
    const s = t * 3.9 + phase;
    let l = 0;
    let r = 0;
    let lean = 0;
    if (pose === 'throw') {
      const k = (Math.sin(s) + 1) / 2;
      r = -0.4 - k * 2.2;
      l = -0.3 - k * 1.6;
      lean = -0.15 + k * 0.3;
    } else if (pose === 'catch') {
      const k = (Math.sin(s + Math.PI * 0.8) + 1) / 2;
      r = -1.2 - k * 0.8;
      l = -1.1 - k * 0.7;
      lean = 0.1 * k;
    } else if (pose === 'paint') {
      r = -1.6 - Math.sin(s * 0.8) * 0.9;
      l = -0.2;
    } else if (pose === 'work') {
      r = -1.3 + Math.sin(s * 1.6) * 0.35;
      l = -0.9 + Math.sin(s * 1.6 + 1) * 0.2;
    } else {
      l = Math.sin(s * 0.5) * 0.08;
      r = -Math.sin(s * 0.5) * 0.08;
    }
    if (armL.current) armL.current.rotation.x = l;
    if (armR.current) armR.current.rotation.x = r;
    if (body.current) body.current.rotation.x = lean;
  });

  return (
    <group {...props}>
      {/* legs */}
      <mesh position={[-0.13, 0.42, 0]} castShadow>
        <boxGeometry args={[0.2, 0.84, 0.24]} />
        <meshStandardMaterial color="#2B3442" />
      </mesh>
      <mesh position={[0.13, 0.42, 0]} castShadow>
        <boxGeometry args={[0.2, 0.84, 0.24]} />
        <meshStandardMaterial color="#2B3442" />
      </mesh>
      <group ref={body} position={[0, 0.84, 0]}>
        {/* torso + vest */}
        <mesh position={[0, 0.36, 0]} castShadow>
          <boxGeometry args={[0.52, 0.72, 0.32]} />
          <meshStandardMaterial color="#E86F1C" />
        </mesh>
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[0.54, 0.07, 0.34]} />
          <meshStandardMaterial color="#F4F4F0" emissive="#F4F4F0" emissiveIntensity={0.25} />
        </mesh>
        {/* head + hat */}
        <mesh position={[0, 0.86, 0]} castShadow>
          <sphereGeometry args={[0.17, 16, 12]} />
          <meshStandardMaterial color={C.skin} />
        </mesh>
        <mesh position={[0, 0.94, 0]} castShadow>
          <sphereGeometry args={[0.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={hat} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.94, 0.05]} rotation={[-0.05, 0, 0]}>
          <cylinderGeometry args={[0.26, 0.26, 0.03, 20]} />
          <meshStandardMaterial color={hat} roughness={0.35} />
        </mesh>
        {/* arms pivot at the shoulder */}
        <group ref={armL} position={[-0.33, 0.66, 0]}>
          <mesh position={[0, -0.3, 0]} castShadow>
            <boxGeometry args={[0.14, 0.62, 0.14]} />
            <meshStandardMaterial color="#E86F1C" />
          </mesh>
        </group>
        <group ref={armR} position={[0.33, 0.66, 0]}>
          <mesh position={[0, -0.3, 0]} castShadow>
            <boxGeometry args={[0.14, 0.62, 0.14]} />
            <meshStandardMaterial color="#E86F1C" />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// A square lattice mast or jib built from thin struts in one InstancedMesh
export function Lattice({
  length,
  width = 1,
  segment = 1.4,
  axis = 'y',
  color = C.lime,
  ...props
}: { length: number; width?: number; segment?: number; axis?: 'x' | 'y'; color?: string } & ThreeElements['group']) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const struts = useMemo(() => {
    const list: THREE.Matrix4[] = [];
    const h = width / 2;
    const corners: [number, number][] = [
      [-h, -h],
      [h, -h],
      [h, h],
      [-h, h],
    ];
    const n = Math.ceil(length / segment);
    const tmp = new THREE.Object3D();
    const thick = 0.09;
    // long chords
    for (const [a, b] of corners) {
      tmp.position.set(a, length / 2, b);
      tmp.rotation.set(0, 0, 0);
      tmp.scale.set(thick * 1.6, length, thick * 1.6);
      tmp.updateMatrix();
      list.push(tmp.matrix.clone());
    }
    // zig-zag diagonals on each face
    for (let i = 0; i < n; i++) {
      const y0 = i * segment;
      for (let f = 0; f < 4; f++) {
        const [ax, az] = corners[f];
        const [bx, bz] = corners[(f + 1) % 4];
        const flip = (i + f) % 2 === 0;
        const start = new THREE.Vector3(ax, flip ? y0 : y0 + segment, az);
        const end = new THREE.Vector3(bx, flip ? y0 + segment : y0, bz);
        const mid = start.clone().add(end).multiplyScalar(0.5);
        const dir = end.clone().sub(start);
        tmp.position.copy(mid);
        tmp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
        tmp.scale.set(thick, dir.length(), thick);
        tmp.updateMatrix();
        list.push(tmp.matrix.clone());
      }
    }
    return list;
  }, [length, width, segment]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    struts.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
  }, [struts]);

  return (
    <group {...props} rotation={axis === 'x' ? [0, 0, -Math.PI / 2] : undefined}>
      <instancedMesh ref={ref} args={[undefined, undefined, struts.length]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.2} />
      </instancedMesh>
    </group>
  );
}

// Truck wheel with hub, spun by the parent via the rotation of the group
export function Wheel(props: ThreeElements['group']) {
  return (
    <group {...props}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.5, 0.36, 18]} />
        <meshStandardMaterial color="#151613" roughness={0.9} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.24, 0.24, 0.38, 10]} />
        <meshStandardMaterial color="#9A9A92" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}
