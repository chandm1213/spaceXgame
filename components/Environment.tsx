'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';

// --- Deterministic value noise for the regolith terrain ---
function hash(x: number, z: number) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function smooth(t: number) {
  return t * t * (3 - 2 * t);
}
function noise(x: number, z: number) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = smooth(x - xi);
  const zf = smooth(z - zi);
  const a = hash(xi, zi);
  const b = hash(xi + 1, zi);
  const c = hash(xi, zi + 1);
  const d = hash(xi + 1, zi + 1);
  return a + (b - a) * xf + (c - a) * zf + (a - b - c + d) * xf * zf;
}
export function terrainHeight(x: number, z: number) {
  let h = 0;
  h += noise(x * 0.02, z * 0.02) * 5.0;
  h += noise(x * 0.06, z * 0.06) * 2.0;
  h += noise(x * 0.18, z * 0.18) * 0.6;
  return h;
}

const TERRAIN_BASE = -5.5;

function PhobosTerrain() {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(420, 420, 140, 140);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, terrainHeight(x, z));
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh geometry={geometry} position={[0, TERRAIN_BASE, 0]} receiveShadow>
      <meshStandardMaterial color="#56565e" roughness={0.95} metalness={0.05} />
    </mesh>
  );
}

function SurfaceRocks({ count = 90 }: { count?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const matrices = useMemo(() => {
    const dummy = new THREE.Object3D();
    const list: THREE.Matrix4[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 8 + Math.random() * 190;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      dummy.position.set(x, TERRAIN_BASE + terrainHeight(x, z) + 0.2, z);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      const s = 0.6 + Math.random() * Math.random() * 3.4;
      dummy.scale.set(s, s * (0.7 + Math.random() * 0.6), s);
      dummy.updateMatrix();
      list.push(dummy.matrix.clone());
    }
    return list;
  }, [count]);

  return (
    <instancedMesh
      ref={(mesh) => {
        if (mesh) {
          matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
          mesh.instanceMatrix.needsUpdate = true;
        }
        (ref as any).current = mesh;
      }}
      args={[undefined, undefined, count]}
      castShadow
      receiveShadow
    >
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#494951" roughness={0.9} metalness={0.08} />
    </instancedMesh>
  );
}

function FloatingAsteroids({ count = 45 }: { count?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(
    () =>
      Array.from({ length: count }, () => {
        const angle = Math.random() * Math.PI * 2;
        const radius = 15 + Math.random() * 170;
        return {
          pos: new THREE.Vector3(
            Math.cos(angle) * radius,
            3 + Math.random() * 14,
            Math.sin(angle) * radius
          ),
          rot: new THREE.Euler(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
          ),
          spin: (Math.random() - 0.5) * 0.4,
          bob: Math.random() * Math.PI * 2,
          scale: 0.5 + Math.random() * Math.random() * 2.6,
        };
      }),
    [count]
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    data.forEach((a, i) => {
      dummy.position.copy(a.pos);
      // Drift gently in microgravity
      dummy.position.y += Math.sin(t * 0.3 + a.bob) * 0.6;
      dummy.rotation.set(a.rot.x + t * a.spin, a.rot.y + t * a.spin * 0.7, a.rot.z);
      dummy.scale.setScalar(a.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} castShadow receiveShadow>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial color="#5b5b66" roughness={0.85} metalness={0.12} flatShading />
    </instancedMesh>
  );
}

// Soft radial glow texture for distant galaxies
function makeGalaxyTexture(inner: string, outer: string) {
  const size = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.25, outer);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  // A couple of faint spiral sweeps for galaxy character
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = outer;
  ctx.lineWidth = 6;
  for (let s = 0; s < 2; s++) {
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 2.4; a += 0.1) {
      const r = a * 14 + 8;
      const x = size / 2 + Math.cos(a + s * Math.PI) * r;
      const y = size / 2 + Math.sin(a + s * Math.PI) * r * 0.5;
      a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  return tex;
}

function Galaxies() {
  const spirals = useMemo(
    () => [
      { tex: makeGalaxyTexture('rgba(255,255,255,0.9)', 'rgba(168,85,247,0.55)'), pos: [150, 38, -320], size: 64, rot: 0.5 },
      { tex: makeGalaxyTexture('rgba(255,245,230,0.9)', 'rgba(56,189,248,0.4)'), pos: [-160, 48, -340], size: 50, rot: -0.8 },
      { tex: makeGalaxyTexture('rgba(255,255,255,0.85)', 'rgba(232,121,249,0.45)'), pos: [40, 58, -350], size: 44, rot: 1.4 },
    ],
    []
  );
  return (
    <>
      {spirals.map((s, i) => (
        <mesh key={i} position={s.pos as [number, number, number]} rotation={[0, 0, s.rot]}>
          <planeGeometry args={[s.size, s.size]} />
          <meshBasicMaterial
            map={s.tex}
            transparent
            opacity={0.85}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            fog={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  );
}

// A distant ringed gas giant for depth
function RingedPlanet() {
  return (
    <group position={[125, 34, -300]} rotation={[1.1, 0, 0.3]}>
      <mesh>
        <sphereGeometry args={[46, 48, 48]} />
        <meshStandardMaterial color="#3b2a6b" emissive="#5b3ba8" emissiveIntensity={0.25} roughness={1} fog={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2.1, 0, 0]}>
        <ringGeometry args={[58, 88, 64]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.35} side={THREE.DoubleSide} fog={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Mars() {
  return (
    <group position={[-95, 45, -285]}>
      <mesh>
        <sphereGeometry args={[115, 64, 64]} />
        <meshStandardMaterial
          color="#7c2d12"
          emissive="#b4530a"
          emissiveIntensity={0.28}
          roughness={1}
          fog={false}
        />
      </mesh>
      {/* Atmospheric rim glow */}
      <mesh scale={1.05}>
        <sphereGeometry args={[115, 48, 48]} />
        <meshBasicMaterial color="#f97316" transparent opacity={0.07} side={THREE.BackSide} fog={false} />
      </mesh>
    </group>
  );
}

export default function Environment() {
  return (
    <>
      {/* Near-total darkness: starlight only */}
      <ambientLight intensity={0.045} color="#8090c0" />
      {/* The faintest Mars-shine from above */}
      <hemisphereLight intensity={0.05} color="#b4530a" groundColor="#0a0a12" />

      <Stars radius={320} depth={90} count={8000} factor={5} saturation={0} fade speed={0.4} />
      <Galaxies />
      <Mars />
      <RingedPlanet />
      <PhobosTerrain />
      <SurfaceRocks />
      <FloatingAsteroids />
    </>
  );
}
