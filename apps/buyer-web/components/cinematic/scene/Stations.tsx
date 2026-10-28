'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { chapterRamp } from '../chapters';
import { C, Wheel, Worker, clamp01, easeOut, useStory } from './parts';
import { makeStreamMaterial, makeWaterSurfaceMaterial } from './shaders';
import { nightAt } from './World';

const tmp = new THREE.Object3D();

// ── 1. Flatbed truck bringing TMT bars in through the site gate ────────────────
export function SteelTruck() {
  const truck = useRef<THREE.Group>(null);
  const wheels = useRef<(THREE.Group | null)[]>([]);
  const bars = useRef<THREE.InstancedMesh>(null);
  const lastX = useRef<number | null>(null);
  const { read } = useStory();

  useLayoutEffect(() => {
    const mesh = bars.current;
    if (!mesh) return;
    let i = 0;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 8 - row; col++) {
        tmp.position.set(-0.4, 1.38 + row * 0.15, -0.55 + col * 0.155 + row * 0.077);
        tmp.rotation.set(0, 0, Math.PI / 2);
        tmp.updateMatrix();
        mesh.setMatrixAt(i++, tmp.matrix);
      }
    }
    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame((state) => {
    const { p } = read(state.clock.elapsedTime);
    const x = -95 + 83 * easeOut(chapterRamp(p, 1) * 1.05);
    if (truck.current) truck.current.position.x = x;
    if (lastX.current !== null) {
      const d = x - lastX.current;
      wheels.current.forEach((w) => w && (w.rotation.z -= d / 0.5));
    }
    lastX.current = x;
  });

  const wheelX = [-2.5, -1.4, 2.3];
  return (
    <group ref={truck} position={[-95, 0, 16]}>
      <mesh position={[0, 0.95, 0]} castShadow>
        <boxGeometry args={[7, 0.45, 2.3]} />
        <meshStandardMaterial color={C.ink3} />
      </mesh>
      <mesh position={[-0.4, 1.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[5.4, 0.15, 2.3]} />
        <meshStandardMaterial color="#5B5C55" />
      </mesh>
      {/* cab */}
      <mesh position={[2.75, 2.05, 0]} castShadow>
        <boxGeometry args={[1.6, 1.9, 2.3]} />
        <meshStandardMaterial color={C.cobalt} roughness={0.4} />
      </mesh>
      <mesh position={[3.56, 2.35, 0]}>
        <boxGeometry args={[0.04, 0.8, 2.0]} />
        <meshStandardMaterial color="#141C2B" metalness={0.8} roughness={0.1} />
      </mesh>
      <mesh position={[3.57, 1.3, 0]}>
        <boxGeometry args={[0.05, 0.3, 2.2]} />
        <meshStandardMaterial color={C.lime} emissive={C.lime} emissiveIntensity={0.3} />
      </mesh>
      {/* TMT bar bundle with straps */}
      <instancedMesh ref={bars} args={[undefined, undefined, 40]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 5.3, 8]} />
        <meshStandardMaterial color={C.steel} metalness={0.5} roughness={0.55} />
      </instancedMesh>
      {[-2, 0, 1.6].map((sx) => (
        <mesh key={sx} position={[sx, 1.6, 0]}>
          <boxGeometry args={[0.12, 0.7, 1.4]} />
          <meshStandardMaterial color={C.lime} />
        </mesh>
      ))}
      {wheelX.flatMap((wx, k) =>
        [-1.2, 1.2].map((wz, j) => (
          <Wheel key={`${k}${j}`} ref={(g: THREE.Group | null) => { wheels.current[k * 2 + j] = g; }} position={[wx, 0.5, wz]} />
        ))
      )}
    </group>
  );
}

// Stockyard by the gate: sand and aggregate heaps, cement bags on pallets
export function Stockyard() {
  return (
    <group>
      <mesh position={[-16, 1.1, 8.5]} castShadow receiveShadow>
        <coneGeometry args={[3.2, 2.3, 24]} />
        <meshStandardMaterial color="#D8B57A" roughness={1} />
      </mesh>
      <mesh position={[-10.5, 0.9, 7]} castShadow receiveShadow>
        <coneGeometry args={[2.5, 1.9, 9]} />
        <meshStandardMaterial color="#77756C" roughness={1} flatShading />
      </mesh>
      {[0, 1].map((k) => (
        <group key={k} position={[-5.8 + k * 2.1, 0, 9.2]}>
          <mesh position={[0, 0.1, 0]} receiveShadow>
            <boxGeometry args={[1.8, 0.2, 1.4]} />
            <meshStandardMaterial color={C.wood} />
          </mesh>
          {Array.from({ length: 4 }, (_, r) =>
            [-0.42, 0.42].map((bx) => (
              <mesh key={`${r}${bx}`} position={[bx, 0.34 + r * 0.26, 0]} castShadow>
                <boxGeometry args={[0.8, 0.24, 1.25]} />
                <meshStandardMaterial color={r % 2 ? '#ECE7DA' : '#E2DCCB'} roughness={0.95} />
              </mesh>
            ))
          )}
        </group>
      ))}
    </group>
  );
}

// ── 2. Transit mixer pouring concrete into formwork ────────────────────────────
export function ConcreteMixer() {
  const drum = useRef<THREE.Group>(null);
  const flow = useRef<THREE.InstancedMesh>(null);
  const fill = useRef<THREE.Mesh>(null);
  const { read } = useStory();
  const drumGeo = useMemo(() => {
    const pts = [
      [0.25, -1.95],
      [0.95, -1.4],
      [1.2, -0.25],
      [1.1, 0.75],
      [0.6, 1.7],
      [0.38, 1.95],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    return new THREE.LatheGeometry(pts, 28);
  }, []);
  const a = useMemo(() => new THREE.Vector3(2.4, 3.0, 15.5), []);
  const b = useMemo(() => new THREE.Vector3(1.0, 1.55, 13.7), []);
  const c = useMemo(() => new THREE.Vector3(0.6, 0.55, 13.1), []);
  const drops = 46;

  useFrame((state) => {
    const { p, t } = read(state.clock.elapsedTime);
    if (drum.current) drum.current.rotation.y = t * 1.6;
    const pour = clamp01(chapterRamp(p, 2) * 1.6);
    if (fill.current) fill.current.scale.y = 0.08 + 0.92 * easeOut(chapterRamp(p, 2));
    const mesh = flow.current;
    if (!mesh) return;
    for (let i = 0; i < drops; i++) {
      const u = (t * 0.55 + i / drops) % 1;
      if (u < 0.65) tmp.position.lerpVectors(a, b, u / 0.65);
      else {
        const k = (u - 0.65) / 0.35;
        tmp.position.lerpVectors(b, c, k);
        tmp.position.y -= Math.sin(k * Math.PI) * -0.15;
      }
      tmp.scale.setScalar(pour * (0.75 + 0.5 * Math.sin(i * 12.9) ** 2));
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {/* truck body facing +x, drum opening at the rear (-x) */}
      <group position={[5.6, 0, 15.5]}>
        <mesh position={[0, 0.95, 0]} castShadow>
          <boxGeometry args={[6.6, 0.45, 2.3]} />
          <meshStandardMaterial color={C.ink3} />
        </mesh>
        <mesh position={[2.55, 2.0, 0]} castShadow>
          <boxGeometry args={[1.5, 1.9, 2.3]} />
          <meshStandardMaterial color={C.lime} roughness={0.4} />
        </mesh>
        <mesh position={[3.31, 2.3, 0]}>
          <boxGeometry args={[0.04, 0.8, 2.0]} />
          <meshStandardMaterial color="#141C2B" metalness={0.8} roughness={0.1} />
        </mesh>
        {[-2.4, -1.3, 2.2].flatMap((wx) => [-1.2, 1.2].map((wz) => <Wheel key={`${wx}${wz}`} position={[wx, 0.5, wz]} />))}
        <group position={[-0.8, 2.45, 0]} rotation={[0, 0, Math.PI / 2 - 0.24]}>
          <group ref={drum}>
            <mesh geometry={drumGeo} castShadow>
              <meshStandardMaterial color="#E9E4D6" roughness={0.45} metalness={0.15} side={THREE.DoubleSide} />
            </mesh>
            {Array.from({ length: 8 }, (_, k) => {
              const ang = (k / 8) * Math.PI * 2;
              return (
                <mesh key={k} position={[Math.cos(ang) * 1.18, -0.2 + (k % 2) * 0.5, Math.sin(ang) * 1.18]} rotation={[0, -ang, 0.5]}>
                  <boxGeometry args={[0.08, 0.9, 0.35]} />
                  <meshStandardMaterial color={C.ink} />
                </mesh>
              );
            })}
          </group>
        </group>
        {/* chute */}
        <mesh position={[-3.95, 2.3, -0.9]} rotation={[0.55, 0.62, 0.5]} castShadow>
          <boxGeometry args={[0.35, 0.12, 2.6]} />
          <meshStandardMaterial color="#6F6F68" metalness={0.5} roughness={0.4} />
        </mesh>
      </group>

      <instancedMesh ref={flow} args={[undefined, undefined, drops]}>
        <sphereGeometry args={[0.13, 8, 6]} />
        <meshStandardMaterial color="#8E8A80" roughness={0.6} />
      </instancedMesh>

      {/* formwork box with the concrete level rising */}
      <group position={[0.4, 0, 12.8]}>
        {[
          [0, 0.45, -1.15, 3.4, 0.9, 0.1],
          [0, 0.45, 1.15, 3.4, 0.9, 0.1],
          [-1.65, 0.45, 0, 0.1, 0.9, 2.3],
          [1.65, 0.45, 0, 0.1, 0.9, 2.3],
        ].map(([x, y, z, w, h, d], k) => (
          <mesh key={k} position={[x, y, z]} castShadow receiveShadow>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color={C.wood} roughness={0.9} />
          </mesh>
        ))}
        <mesh ref={fill} position={[0, 0.05, 0]} scale={[1, 0.1, 1]}>
          <boxGeometry args={[3.2, 0.8, 2.2]} />
          <meshStandardMaterial color="#8E8A80" roughness={0.55} />
        </mesh>
        {/* rebar mesh poking out */}
        {Array.from({ length: 6 }, (_, k) => (
          <mesh key={k} position={[-1.3 + k * 0.52, 0.9, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.9, 5]} />
            <meshStandardMaterial color={C.steel} />
          </mesh>
        ))}
      </group>
      <Worker pose="work" phase={1.3} position={[2.4, 0, 12.4]} rotation={[0, -1.9, 0]} />
    </group>
  );
}

// ── 3. Bricklayers: one throws, one catches, the wall grows course by course ────
const WALL_COURSES = 9;
const WALL_PER_ROW = 11;
export function BrickWorks() {
  const wall = useRef<THREE.InstancedMesh>(null);
  const flying = useRef<THREE.InstancedMesh>(null);
  const { read } = useStory();
  const from = useMemo(() => new THREE.Vector3(12.3, 1.7, 10.1), []);
  const to = useMemo(() => new THREE.Vector3(14.6, 1.75, 7.6), []);
  const flyingCount = 3;

  const wallMatrices = useMemo(() => {
    const list: THREE.Matrix4[] = [];
    for (let r = 0; r < WALL_COURSES; r++) {
      for (let k = 0; k < WALL_PER_ROW; k++) {
        const offset = r % 2 ? 0.27 : 0;
        tmp.position.set(-3 + k * 0.56 + offset, 0.13 + r * 0.24, 0);
        tmp.rotation.set(0, 0, 0);
        tmp.scale.set(1, 1, 1);
        tmp.updateMatrix();
        list.push(tmp.matrix.clone());
      }
    }
    return list;
  }, []);

  useLayoutEffect(() => {
    const mesh = wall.current;
    if (!mesh) return;
    wallMatrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
  }, [wallMatrices]);

  useFrame((state) => {
    const { p, t } = read(state.clock.elapsedTime);
    if (wall.current) {
      const shown = Math.round((0.25 + 0.75 * chapterRamp(p, 3)) * wallMatrices.length);
      wall.current.count = shown;
    }
    const mesh = flying.current;
    if (!mesh) return;
    for (let i = 0; i < flyingCount; i++) {
      const u = ((t * 3.9) / (Math.PI * 2) + i / flyingCount) % 1;
      tmp.position.lerpVectors(from, to, u);
      tmp.position.y += Math.sin(u * Math.PI) * 1.4;
      tmp.rotation.set(u * 5, u * 3, u * 2);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {/* brick pallet */}
      <group position={[11.2, 0, 10.9]} rotation={[0, 0.4, 0]}>
        <mesh position={[0, 0.1, 0]} receiveShadow>
          <boxGeometry args={[1.7, 0.2, 1.3]} />
          <meshStandardMaterial color={C.wood} />
        </mesh>
        {Array.from({ length: 5 }, (_, r) => (
          <mesh key={r} position={[0, 0.33 + r * 0.25, 0]} castShadow>
            <boxGeometry args={[1.6, 0.22, 1.2]} />
            <meshStandardMaterial color={r % 2 ? C.brick : '#A64A29'} roughness={0.95} />
          </mesh>
        ))}
      </group>
      <group position={[15.4, 0.05, 5.6]} rotation={[0, 0.86, 0]}>
        <mesh position={[0, 0.04, 0]} receiveShadow>
          <boxGeometry args={[6.8, 0.08, 0.7]} />
          <meshStandardMaterial color="#9C978B" />
        </mesh>
        <instancedMesh ref={wall} args={[undefined, undefined, WALL_COURSES * WALL_PER_ROW]} castShadow receiveShadow>
          <boxGeometry args={[0.52, 0.21, 0.42]} />
          <meshStandardMaterial color={C.brick} roughness={0.95} />
        </instancedMesh>
      </group>
      <instancedMesh ref={flying} args={[undefined, undefined, flyingCount]} castShadow>
        <boxGeometry args={[0.46, 0.18, 0.22]} />
        <meshStandardMaterial color={C.brick} roughness={0.95} />
      </instancedMesh>
      <Worker pose="throw" position={[12.1, 0, 10.3]} rotation={[0, 2.4, 0]} />
      <Worker pose="catch" phase={0.4} hat="#FFFFFF" position={[14.8, 0, 7.4]} rotation={[0, -0.75, 0]} />
    </group>
  );
}

// ── 4. Interiors: floor tiles drop and settle in sequence, plywood stacked nearby ──
const TILE_N = 7;
export function TileRoom() {
  const tiles = useRef<THREE.InstancedMesh>(null);
  const { read } = useStory();
  const colorsSet = useRef(false);

  useFrame((state) => {
    const { p } = read(state.clock.elapsedTime);
    const mesh = tiles.current;
    if (!mesh) return;
    if (!colorsSet.current) {
      const col = new THREE.Color();
      for (let i = 0; i < TILE_N * TILE_N; i++) {
        const r = Math.floor(i / TILE_N);
        const c = i % TILE_N;
        mesh.setColorAt(i, col.set((r + c) % 2 ? '#EDE8DC' : '#BFB6A2'));
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      colorsSet.current = true;
    }
    const laid = 6 + chapterRamp(p, 4) * (TILE_N * TILE_N - 6);
    for (let i = 0; i < TILE_N * TILE_N; i++) {
      const r = Math.floor(i / TILE_N);
      const c = i % TILE_N;
      // lay from the back corner outwards in diagonal waves
      const order = (r + c) / (2 * (TILE_N - 1));
      const k = clamp01(laid / (TILE_N * TILE_N) * 1.35 - order * 0.9);
      const s = easeOut(k);
      tmp.position.set(-3 + c * 0.96 + 0.48, 0.24 + (1 - s) * 2.2, -3 + r * 0.96 + 0.48);
      tmp.rotation.set((1 - s) * -1.3, (1 - s) * 0.6, 0);
      tmp.scale.setScalar(k > 0.001 ? 1 : 0.0001);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group position={[15, 0, -6]}>
      <mesh position={[0, 0.12, 0]} receiveShadow>
        <boxGeometry args={[7, 0.14, 7]} />
        <meshStandardMaterial color="#8F8A7E" />
      </mesh>
      <instancedMesh ref={tiles} args={[undefined, undefined, TILE_N * TILE_N]} castShadow receiveShadow>
        <boxGeometry args={[0.92, 0.06, 0.92]} />
        <meshStandardMaterial roughness={0.25} metalness={0.05} />
      </instancedMesh>
      {/* two room walls */}
      <mesh position={[-3.55, 1.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.18, 2.7, 7]} />
        <meshStandardMaterial color="#E8E2D2" />
      </mesh>
      <mesh position={[0, 1.45, -3.55]} castShadow receiveShadow>
        <boxGeometry args={[7, 2.7, 0.18]} />
        <meshStandardMaterial color={C.cobalt} roughness={0.6} />
      </mesh>
      {/* plywood sheets */}
      <group position={[4.6, 0, 2.4]} rotation={[0, 0.3, 0]}>
        {Array.from({ length: 9 }, (_, k) => (
          <mesh key={k} position={[0, 0.06 + k * 0.08, 0]} castShadow>
            <boxGeometry args={[2.4, 0.07, 1.2]} />
            <meshStandardMaterial color={k % 2 ? C.wood : '#B8874D'} roughness={0.8} />
          </mesh>
        ))}
      </group>
      <Worker pose="work" phase={2.2} position={[1.6, 0.2, 2.2]} rotation={[0, -2.4, 0]} hat="#FFFFFF" />
    </group>
  );
}

// ── 5. Painters: bold colours roll up the wall panel by panel ───────────────────
const PAINTS = ['#C8FF3D', '#2457FF', '#E2583E', '#1BA39C', '#FFC845', '#C2408C'];
export function PaintWall() {
  const coats = useRef<(THREE.Mesh | null)[]>([]);
  const roller = useRef<THREE.Group>(null);
  const painter = useRef<THREE.Group>(null);
  const { read } = useStory();
  const W = 1.7;
  const H = 3.2;

  useFrame((state) => {
    const { p, t } = read(state.clock.elapsedTime);
    const done = 0.6 + chapterRamp(p, 5) * (PAINTS.length - 0.6);
    let active = 0;
    coats.current.forEach((m, k) => {
      if (!m) return;
      const s = clamp01(done - k);
      m.scale.y = Math.max(0.0001, s);
      m.position.y = (s * H) / 2;
      if (s > 0 && s < 1) active = k;
      else if (s >= 1) active = Math.min(k + 1, PAINTS.length - 1);
    });
    const x = -((PAINTS.length - 1) * W) / 2 + active * W;
    const s = clamp01(done - active);
    if (roller.current) {
      roller.current.position.set(x, 0.4 + (s * H * 0.9 + Math.sin(t * 3) * 0.15), -0.42);
    }
    if (painter.current) painter.current.position.x += (x + 0.6 - painter.current.position.x) * 0.08;
  });

  return (
    <group position={[4, 0, -14]}>
      {PAINTS.map((color, k) => {
        const x = -((PAINTS.length - 1) * W) / 2 + k * W;
        return (
          <group key={color} position={[x, 0, 0]}>
            <mesh position={[0, H / 2, 0.02]} receiveShadow castShadow>
              <boxGeometry args={[W - 0.04, H, 0.25]} />
              <meshStandardMaterial color="#D9D4C7" roughness={0.95} />
            </mesh>
            <mesh ref={(m) => { coats.current[k] = m; }} position={[0, 0, -0.12]}>
              <boxGeometry args={[W - 0.04, H, 0.02]} />
              <meshStandardMaterial color={color} roughness={0.6} />
            </mesh>
          </group>
        );
      })}
      {/* paint roller on a pole */}
      <group ref={roller}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.12, 0.12, 0.6, 12]} />
          <meshStandardMaterial color="#F5F2EA" />
        </mesh>
        <mesh position={[0, -0.7, -0.15]} rotation={[0.2, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 1.4, 6]} />
          <meshStandardMaterial color={C.ink} />
        </mesh>
      </group>
      <group ref={painter} position={[0, 0, -1.2]}>
        <Worker pose="paint" phase={0.7} rotation={[0, 0, 0]} />
      </group>
      {/* paint buckets */}
      {PAINTS.slice(0, 4).map((color, k) => (
        <group key={color} position={[-3.6 + k * 0.6, 0, -1.4]}>
          <mesh position={[0, 0.25, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.2, 0.5, 14]} />
            <meshStandardMaterial color="#ECECE6" metalness={0.3} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.51, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.02, 14]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ── 6. Electrician: strings of colourful lights switch on bulb by bulb ──────────
const STRINGS = [
  { y: 6.6, z: -12, sag: 1.2 },
  { y: 5.7, z: -13.2, sag: 0.9 },
  { y: 4.8, z: -11, sag: 0.7 },
];
const BULBS_PER = 15;
const BULB_COLORS = ['#FF4D6D', '#FFC845', '#C8FF3D', '#3DDCFF', '#7B61FF', '#FF8A3D'];

export function LightStrings() {
  const bulbs = useRef<THREE.InstancedMesh>(null);
  const lights = useRef<(THREE.PointLight | null)[]>([]);
  const led = useRef<THREE.MeshStandardMaterial>(null);
  const { read, high } = useStory();
  const total = STRINGS.length * BULBS_PER;
  const x0 = -15;
  const x1 = -3;

  const { wires, positions } = useMemo(() => {
    const ws: THREE.TubeGeometry[] = [];
    const ps: THREE.Vector3[] = [];
    for (const s of STRINGS) {
      const pts = Array.from({ length: 12 }, (_, k) => {
        const u = k / 11;
        return new THREE.Vector3(x0 + (x1 - x0) * u, s.y - Math.sin(u * Math.PI) * s.sag, s.z);
      });
      const curve = new THREE.CatmullRomCurve3(pts);
      ws.push(new THREE.TubeGeometry(curve, 40, 0.025, 5));
      for (let k = 0; k < BULBS_PER; k++) ps.push(curve.getPoint((k + 0.5) / BULBS_PER).add(new THREE.Vector3(0, -0.14, 0)));
    }
    return { wires: ws, positions: ps };
  }, []);

  useLayoutEffect(() => {
    const mesh = bulbs.current;
    if (!mesh) return;
    positions.forEach((pt, i) => {
      tmp.position.copy(pt);
      tmp.rotation.set(0, 0, 0);
      tmp.scale.setScalar(1);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [positions]);

  const col = useMemo(() => new THREE.Color(), []);
  const off = useMemo(() => new THREE.Color('#3A3830'), []);

  useFrame((state) => {
    const { p, t } = read(state.clock.elapsedTime);
    const on = chapterRamp(p, 6) * total * 1.1 + Math.max(0, p - 6.5) * total;
    const night = nightAt(p);
    const mesh = bulbs.current;
    if (mesh) {
      for (let i = 0; i < total; i++) {
        const lit = clamp01(on - i);
        const base = BULB_COLORS[(i + Math.floor(t * 2)) % BULB_COLORS.length];
        col.set(base).multiplyScalar(0.6 + 2.6 * lit * (0.6 + 0.4 * night));
        col.lerpColors(off, col, lit);
        mesh.setColorAt(i, col);
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    lights.current.forEach((l, k) => {
      if (!l) return;
      l.intensity = clamp01(on / total) * (6 + night * 18) * (0.85 + 0.15 * Math.sin(t * 5 + k * 2));
      l.color.set(BULB_COLORS[(k * 2 + Math.floor(t * 2)) % BULB_COLORS.length]);
    });
    if (led.current) led.current.emissiveIntensity = Math.sin(t * 9) > 0.2 ? 2.5 : 0.2;
  });

  return (
    <group>
      {[x0, x1].map((x) => (
        <mesh key={x} position={[x, 3.6, -12]} castShadow>
          <cylinderGeometry args={[0.12, 0.16, 7.2, 10]} />
          <meshStandardMaterial color={C.ink3} />
        </mesh>
      ))}
      {wires.map((g, k) => (
        <mesh key={k} geometry={g}>
          <meshStandardMaterial color="#111" />
        </mesh>
      ))}
      <instancedMesh ref={bulbs} args={[undefined, undefined, total]}>
        <sphereGeometry args={[0.13, 12, 10]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      {high &&
        [-12, -9, -6].map((x, k) => (
          <pointLight key={x} ref={(l) => { lights.current[k] = l; }} position={[x, 4.4, -12.2]} distance={12} decay={1.6} intensity={0} />
        ))}
      {/* distribution board with blinking LED */}
      <group position={[-3, 1.7, -12.3]}>
        <mesh castShadow>
          <boxGeometry args={[0.9, 1.2, 0.25]} />
          <meshStandardMaterial color="#D5D2C8" />
        </mesh>
        {Array.from({ length: 6 }, (_, k) => (
          <mesh key={k} position={[-0.3 + (k % 3) * 0.3, 0.25 - Math.floor(k / 3) * 0.3, -0.14]}>
            <boxGeometry args={[0.2, 0.18, 0.04]} />
            <meshStandardMaterial color={C.ink} />
          </mesh>
        ))}
        <mesh position={[0.32, -0.45, -0.14]}>
          <sphereGeometry args={[0.05, 8, 6]} />
          <meshStandardMaterial ref={led} color={C.lime} emissive={C.lime} emissiveIntensity={2} toneMapped={false} />
        </mesh>
      </group>
      {/* step ladder + electrician */}
      <group position={[-6.2, 0, -12.9]}>
        {[-0.35, 0.35].map((lx) => (
          <mesh key={lx} position={[lx, 1.2, 0]} rotation={[0.12, 0, 0]}>
            <boxGeometry args={[0.07, 2.4, 0.07]} />
            <meshStandardMaterial color="#B8B9B4" metalness={0.6} roughness={0.35} />
          </mesh>
        ))}
        {[0.4, 0.9, 1.4].map((ly) => (
          <mesh key={ly} position={[0, ly, -0.05]}>
            <boxGeometry args={[0.7, 0.05, 0.18]} />
            <meshStandardMaterial color="#B8B9B4" metalness={0.6} roughness={0.35} />
          </mesh>
        ))}
        <Worker pose="work" phase={0.2} position={[0, 1.45, 0.05]} rotation={[0, Math.PI, 0]} hat="#FFFFFF" />
      </group>
    </group>
  );
}

// ── 7. Plumbing: hotel-grade bathroom, gold tap filling a freestanding tub ──────
export function Bathroom() {
  const surface = useMemo(makeWaterSurfaceMaterial, []);
  const stream = useMemo(makeStreamMaterial, []);
  const shower = useRef<THREE.InstancedMesh>(null);
  const warm = useRef<THREE.PointLight>(null);
  const { read, high } = useStory();
  const tubGeo = useMemo(
    () =>
      new THREE.LatheGeometry(
        [
          [0.01, 0.02],
          [0.7, 0.02],
          [0.86, 0.22],
          [0.93, 0.66],
          [0.86, 0.69],
          [0.8, 0.5],
        ].map(([r, y]) => new THREE.Vector2(r, y)),
        40
      ),
    []
  );
  const tapCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 1.0, 0),
        new THREE.Vector3(-0.05, 1.32, 0),
        new THREE.Vector3(-0.35, 1.36, 0),
        new THREE.Vector3(-0.58, 1.2, 0),
      ]),
    []
  );
  const dropsN = 48;

  useFrame((state) => {
    const { p, t } = read(state.clock.elapsedTime);
    surface.uniforms.uTime.value = t;
    stream.uniforms.uTime.value = t;
    stream.uniforms.uOn.value = 0.35 + 0.65 * chapterRamp(p, 7);
    if (warm.current) warm.current.intensity = 3 + nightAt(p) * 14;
    const mesh = shower.current;
    if (!mesh) return;
    for (let i = 0; i < dropsN; i++) {
      const u = (t * 1.1 + (i * 0.6180339) % 1) % 1;
      const ang = i * 2.399;
      const rad = 0.06 + ((i * 0.37) % 1) * 0.24;
      tmp.position.set(Math.cos(ang) * rad, 2.55 - u * 2.45, Math.sin(ang) * rad);
      tmp.scale.set(1, 3.5, 1);
      tmp.rotation.set(0, 0, 0);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group position={[-15.5, 0, -2]}>
      {/* raised marble floor with a gold edge */}
      <mesh position={[0, 0.15, 0]} receiveShadow>
        <boxGeometry args={[6.4, 0.3, 6.4]} />
        <meshStandardMaterial color={C.marble} roughness={0.12} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.31, 3.2]}>
        <boxGeometry args={[6.4, 0.03, 0.06]} />
        <meshStandardMaterial color={C.gold} metalness={1} roughness={0.25} />
      </mesh>
      {/* dark marble walls with gold inlays (back = +x, side = -z) */}
      <mesh position={[3.15, 1.85, 0]} receiveShadow>
        <boxGeometry args={[0.2, 3.4, 6.4]} />
        <meshStandardMaterial color={C.darkMarble} roughness={0.2} metalness={0.1} />
      </mesh>
      <mesh position={[0, 1.85, -3.15]} receiveShadow>
        <boxGeometry args={[6.4, 3.4, 0.2]} />
        <meshStandardMaterial color={C.darkMarble} roughness={0.2} metalness={0.1} />
      </mesh>
      {[-1.6, 0, 1.6].map((z) => (
        <mesh key={z} position={[3.04, 1.85, z]}>
          <boxGeometry args={[0.02, 3.2, 0.04]} />
          <meshStandardMaterial color={C.gold} metalness={1} roughness={0.25} />
        </mesh>
      ))}
      {/* mirror + vanity on the side wall */}
      <mesh position={[-1.4, 1.95, -3.03]}>
        <planeGeometry args={[1.6, 1.1]} />
        <meshStandardMaterial color="#AFC3CF" metalness={1} roughness={0.04} />
      </mesh>
      <mesh position={[-1.4, 1.0, -2.75]} castShadow>
        <boxGeometry args={[1.8, 0.14, 0.6]} />
        <meshStandardMaterial color={C.marble} roughness={0.1} />
      </mesh>

      {/* freestanding tub, long axis along x */}
      <group position={[0, 0.3, 0.2]} scale={[1.7, 1, 1]}>
        <mesh geometry={tubGeo} castShadow receiveShadow>
          <meshPhysicalMaterial color="#FBFAF6" roughness={0.08} clearcoat={1} clearcoatRoughness={0.05} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.56, 0]} rotation={[-Math.PI / 2, 0, 0]} material={surface}>
          <circleGeometry args={[0.84, 40]} />
        </mesh>
      </group>
      {/* gold floor-standing tap and its stream */}
      <group position={[2.0, 0.3, 0.2]}>
        <mesh>
          <tubeGeometry args={[tapCurve, 40, 0.045, 10]} />
          <meshStandardMaterial color={C.gold} metalness={1} roughness={0.22} />
        </mesh>
        <mesh position={[-0.58, 0.85, 0]} material={stream}>
          <cylinderGeometry args={[0.035, 0.05, 0.62, 10, 1, true]} />
        </mesh>
      </group>
      {/* rain shower in the back corner behind glass */}
      <group position={[2.3, 0.3, -2.3]}>
        <mesh position={[0, 2.62, 0]}>
          <cylinderGeometry args={[0.32, 0.32, 0.04, 24]} />
          <meshStandardMaterial color={C.gold} metalness={1} roughness={0.22} />
        </mesh>
        <instancedMesh ref={shower} args={[undefined, undefined, dropsN]}>
          <sphereGeometry args={[0.018, 5, 4]} />
          <meshStandardMaterial color="#CFF2FF" emissive="#9FE3FF" emissiveIntensity={0.6} transparent opacity={0.8} />
        </instancedMesh>
        <mesh position={[-0.75, 1.4, 0]}>
          <boxGeometry args={[0.02, 2.4, 1.5]} />
          <meshPhysicalMaterial color="#DDEFF5" transmission={0.9} roughness={0.05} thickness={0.1} transparent opacity={0.35} />
        </mesh>
      </group>
      {/* plant */}
      <group position={[-2.5, 0.3, 2.4]}>
        <mesh position={[0, 0.3, 0]} castShadow>
          <cylinderGeometry args={[0.28, 0.22, 0.6, 16]} />
          <meshStandardMaterial color={C.ink3} />
        </mesh>
        {Array.from({ length: 6 }, (_, k) => (
          <mesh key={k} position={[Math.cos(k) * 0.12, 0.95, Math.sin(k) * 0.12]} rotation={[Math.cos(k) * 0.5, 0, Math.sin(k) * 0.5]} castShadow>
            <coneGeometry args={[0.14, 0.9, 6]} />
            <meshStandardMaterial color="#2F6B3A" />
          </mesh>
        ))}
      </group>
      <pointLight ref={warm} position={[0.5, 2.8, 0.2]} color="#FFD29A" intensity={4} distance={9} decay={1.5} castShadow={false} />
      {high && <pointLight position={[2.3, 2.4, -2.3]} color="#9FE3FF" intensity={3} distance={4} />}
      <Worker pose="work" phase={1.7} position={[1.5, 0.3, 1.6]} rotation={[0, -2.2, 0]} hat={C.lime} />
    </group>
  );
}
