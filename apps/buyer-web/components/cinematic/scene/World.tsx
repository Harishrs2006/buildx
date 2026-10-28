'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CHAPTERS, LAST_CHAPTER } from '../chapters';
import { C, Lattice, clamp01, easeInOut, useStory } from './parts';
import { makeCityMaterial, makeSkyMaterial } from './shaders';

// 0 by day, 1 at dusk: the story moves into evening for electrical, plumbing and the skyline
export function nightAt(p: number) {
  return clamp01((p - 5.3) / 1.2) * 0.8 + clamp01((p - 7.2) / 0.8) * 0.2;
}

// Camera flies chapter to chapter: holds near each chapter, swoops up in between,
// orbits slowly on the hero and follows the pointer a little on desktop.
export function CameraRig() {
  const { camera, pointer, size } = useThree();
  const { read, high } = useStory();
  const pos = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const a = useMemo(() => new THREE.Vector3(), []);
  const b = useMemo(() => new THREE.Vector3(), []);
  const smoothPointer = useRef({ x: 0, y: 0 });

  useFrame((state) => {
    const { p, t } = read(state.clock.elapsedTime);
    const i = Math.min(Math.floor(p), LAST_CHAPTER - 1);
    const f = easeInOut((p - i - 0.12) / 0.76);
    const from = CHAPTERS[i].camera;
    const to = CHAPTERS[i + 1].camera;

    pos.lerpVectors(a.fromArray(from.position), b.fromArray(to.position), f);
    look.lerpVectors(a.fromArray(from.target), b.fromArray(to.target), f);
    pos.y += Math.sin(f * Math.PI) * 6;

    // slow orbit on the hero and the final skyline
    const orbit = (1 - clamp01(p)) * t * 0.05 + clamp01(p - (LAST_CHAPTER - 0.5)) * Math.sin(t * 0.1) * 0.25;
    if (orbit !== 0) {
      const dx = pos.x - look.x;
      const dz = pos.z - look.z;
      const c = Math.cos(orbit);
      const s = Math.sin(orbit);
      pos.x = look.x + dx * c - dz * s;
      pos.z = look.z + dx * s + dz * c;
    }

    if (high) {
      smoothPointer.current.x += (pointer.x - smoothPointer.current.x) * 0.04;
      smoothPointer.current.y += (pointer.y - smoothPointer.current.y) * 0.04;
      pos.x += smoothPointer.current.x * 1.6;
      pos.y += smoothPointer.current.y * 0.9;
    }

    // Portrait screens: widen the vertical field of view so the scene is not a thin slice
    const persp = camera as THREE.PerspectiveCamera;
    const aspect = size.width / size.height;
    const fov = aspect >= 1 ? 38 : Math.min(70, (2 * Math.atan((Math.tan((19 * Math.PI) / 180) * 0.95) / aspect) * 180) / Math.PI);
    if (Math.abs(persp.fov - fov) > 0.01) {
      persp.fov = fov;
      persp.updateProjectionMatrix();
    }

    camera.position.copy(pos);
    camera.lookAt(look);
  });
  return null;
}

export function Environment() {
  const { scene } = useThree();
  const { read, high } = useStory();
  const sky = useMemo(makeSkyMaterial, []);
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const fogDay = useMemo(() => new THREE.Color('#E9D3AE'), []);
  const fogNight = useMemo(() => new THREE.Color('#2A2236'), []);

  useLayoutEffect(() => {
    scene.fog = new THREE.Fog('#E9D3AE', 55, 230);
    return () => {
      scene.fog = null;
    };
  }, [scene]);

  useFrame((state) => {
    const { p } = read(state.clock.elapsedTime);
    const n = nightAt(p);
    sky.uniforms.uNight.value = n;
    (scene.fog as THREE.Fog).color.lerpColors(fogDay, fogNight, n);
    if (sun.current) {
      sun.current.intensity = 2.6 * (1 - n) + 0.15;
      sun.current.color.setHSL(0.09, 0.7, 0.62 + 0.2 * (1 - n));
    }
    if (hemi.current) hemi.current.intensity = 0.95 - n * 0.6;
  });

  return (
    <>
      <mesh material={sky} renderOrder={-1}>
        <sphereGeometry args={[400, 32, 16]} />
      </mesh>
      <hemisphereLight ref={hemi} args={['#FFE9C7', '#5A4E3A', 0.95]} />
      <directionalLight
        ref={sun}
        position={[-30, 55, 22]}
        intensity={2.6}
        castShadow={high}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-camera-far={140}
        shadow-bias={-0.0004}
      />
    </>
  );
}

export function Ground() {
  const posts = useRef<THREE.InstancedMesh>(null);
  const postMatrices = useMemo(() => {
    const list: THREE.Matrix4[] = [];
    const tmp = new THREE.Object3D();
    const half = 23;
    for (let k = -half; k <= half; k += 2.3) {
      for (const [x, z] of [
        [k, -half],
        [k, half],
        [-half, k],
        [half, k],
      ]) {
        if (z === half && x < -3 && x > -21) continue; // gate for the road
        tmp.position.set(x, 0.6, z);
        tmp.updateMatrix();
        list.push(tmp.matrix.clone());
      }
    }
    return list;
  }, []);

  useLayoutEffect(() => {
    const mesh = posts.current;
    if (!mesh) return;
    postMatrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
  }, [postMatrices]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[320, 48]} />
        <meshStandardMaterial color={C.sand} roughness={1} />
      </mesh>
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[46, 0.1, 46]} />
        <meshStandardMaterial color={C.pad} roughness={1} />
      </mesh>
      {/* approach road into the site */}
      <mesh position={[-60, 0.07, 16]} receiveShadow>
        <boxGeometry args={[100, 0.08, 6]} />
        <meshStandardMaterial color="#3A3B36" roughness={0.95} />
      </mesh>
      {Array.from({ length: 14 }, (_, k) => (
        <mesh key={k} position={[-105 + k * 7, 0.12, 16]}>
          <boxGeometry args={[3, 0.02, 0.25]} />
          <meshStandardMaterial color="#E8E1CF" />
        </mesh>
      ))}
      {/* safety fence posts with lime caps */}
      <instancedMesh ref={posts} args={[undefined, undefined, postMatrices.length]} castShadow>
        <boxGeometry args={[0.18, 1.2, 0.18]} />
        <meshStandardMaterial color={C.lime} />
      </instancedMesh>
    </group>
  );
}

const FLOORS = 12;
const FLOOR_H = 1.7;

// The main building rises floor by floor across the whole story; glass and lit windows
// appear on finished floors as evening falls.
export function Building() {
  const floors = useRef<(THREE.Group | null)[]>([]);
  const glass = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#2C3E55', metalness: 0.6, roughness: 0.15, emissive: '#FFC979', emissiveIntensity: 0 }),
    []
  );
  const { read } = useStory();

  useFrame((state) => {
    const { p } = read(state.clock.elapsedTime);
    const built = 3 + clamp01(p / LAST_CHAPTER) * (FLOORS - 3);
    floors.current.forEach((g, k) => {
      if (!g) return;
      const s = clamp01(built - k);
      g.visible = s > 0.01;
      g.scale.y = 0.2 + 0.8 * s;
    });
    glass.emissiveIntensity = nightAt(p) * 1.6;
  });

  const columns: [number, number][] = [
    [-4.2, -4.2],
    [4.2, -4.2],
    [4.2, 4.2],
    [-4.2, 4.2],
    [0, -4.2],
    [0, 4.2],
    [-4.2, 0],
    [4.2, 0],
  ];

  return (
    <group>
      {Array.from({ length: FLOORS }, (_, k) => (
        <group key={k} ref={(g) => { floors.current[k] = g; }} position={[0, k * FLOOR_H, 0]}>
          {columns.map(([x, z], c) => (
            <mesh key={c} position={[x, FLOOR_H / 2, z]} castShadow receiveShadow>
              <boxGeometry args={[0.55, FLOOR_H, 0.55]} />
              <meshStandardMaterial color={C.concreteDark} roughness={0.9} />
            </mesh>
          ))}
          <mesh position={[0, FLOOR_H, 0]} castShadow receiveShadow>
            <boxGeometry args={[9.4, 0.32, 9.4]} />
            <meshStandardMaterial color={C.concrete} roughness={0.85} />
          </mesh>
          {/* glazing on the finished lower floors */}
          {k < FLOORS - 1 && (
            <mesh position={[0, FLOOR_H / 2 + 0.1, 0]} material={glass}>
              <boxGeometry args={[8.2, FLOOR_H - 0.45, 8.2]} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

// Tower crane: lattice mast, jib and counter-jib, turning slowly with a load on the hook
export function Crane() {
  const slew = useRef<THREE.Group>(null);
  const hook = useRef<THREE.Group>(null);
  const beacon = useRef<THREE.MeshStandardMaterial>(null);
  const { read } = useStory();
  const mast = 30;

  useFrame((state) => {
    const { p, t } = read(state.clock.elapsedTime);
    if (slew.current) slew.current.rotation.y = 0.9 + p * 0.55 + Math.sin(t * 0.18) * 0.25;
    if (hook.current) {
      hook.current.position.x = 11 + Math.sin(t * 0.25) * 4;
      const drop = 12 + Math.sin(t * 0.3 + 1) * 5;
      hook.current.children[0].scale.y = drop;
      hook.current.children[0].position.y = -drop / 2;
      hook.current.children[1].position.y = -drop;
    }
    if (beacon.current) beacon.current.emissiveIntensity = (Math.sin(t * 4) > 0 ? 3 : 0.3) * (0.3 + nightAt(p));
  });

  return (
    <group position={[8.5, 0, -8.5]}>
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 1, 3]} />
        <meshStandardMaterial color={C.concreteDark} />
      </mesh>
      <Lattice length={mast} width={1.3} position={[0, 1, 0]} />
      <group ref={slew} position={[0, mast + 1, 0]}>
        {/* operator cab */}
        <mesh position={[0.9, 0.2, 0.9]} castShadow>
          <boxGeometry args={[1.3, 1.3, 1.3]} />
          <meshStandardMaterial color={C.ink3} />
        </mesh>
        <Lattice length={26} width={1} axis="x" position={[0, 0.6, 0]} />
        <group rotation={[0, Math.PI, 0]}>
          <Lattice length={8} width={1} axis="x" position={[0, 0.6, 0]} />
        </group>
        <mesh position={[-7, 0.2, 0]} castShadow>
          <boxGeometry args={[2.2, 1.6, 1.4]} />
          <meshStandardMaterial color={C.ink} />
        </mesh>
        {/* apex and beacon */}
        <Lattice length={4} width={0.8} position={[0, 0.6, 0]} />
        <mesh position={[0, 4.9, 0]}>
          <sphereGeometry args={[0.28, 12, 8]} />
          <meshStandardMaterial ref={beacon} color="#FF5A3D" emissive="#FF3D24" emissiveIntensity={1} />
        </mesh>
        {/* trolley, cable, hook block and a pallet of blocks */}
        <group ref={hook} position={[11, 0, 0]}>
          <mesh>
            <cylinderGeometry args={[0.03, 0.03, 1, 6]} />
            <meshStandardMaterial color="#222" />
          </mesh>
          <group>
            <mesh position={[0, -0.3, 0]} castShadow>
              <boxGeometry args={[0.6, 0.6, 0.4]} />
              <meshStandardMaterial color={C.lime} />
            </mesh>
            <mesh position={[0, -1.2, 0]} castShadow>
              <boxGeometry args={[2, 0.9, 1.4]} />
              <meshStandardMaterial color="#B9B3A4" roughness={0.9} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

// Ring of towers around the site; windows light up as dusk falls
export function City() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const mat = useMemo(makeCityMaterial, []);
  const { read } = useStory();
  const count = 150;

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const tmp = new THREE.Object3D();
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < count; i++) {
      const angle = rand() * Math.PI * 2;
      const r = 105 + rand() * 120;
      const h = 10 + Math.pow(rand(), 2.2) * 70;
      const w = 5 + rand() * 7;
      tmp.position.set(Math.cos(angle) * r, h / 2, Math.sin(angle) * r);
      tmp.rotation.set(0, rand() * Math.PI, 0);
      tmp.scale.set(w, h, w * (0.7 + rand() * 0.6));
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame((state) => {
    mat.uniforms.uNight.value = nightAt(read(state.clock.elapsedTime).p);
  });

  return (
    <instancedMesh ref={ref} args={[undefined, mat, count]}>
      <boxGeometry args={[1, 1, 1]} />
    </instancedMesh>
  );
}
