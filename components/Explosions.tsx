'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame, BoomData } from '@/lib/store';

const LIFE = 0.7; // seconds

function Explosion({ data }: { data: BoomData }) {
  const shell = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const points = useRef<THREE.Points>(null);
  const age = useRef(0);

  // Debris particles flung outward in low gravity
  const { positions, velocities } = useMemo(() => {
    const n = data.big ? 26 : 16;
    const positions = new Float32Array(n * 3);
    const velocities: THREE.Vector3[] = [];
    for (let i = 0; i < n; i++) {
      velocities.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        ).normalize().multiplyScalar(4 + Math.random() * 7)
      );
    }
    return { positions, velocities };
  }, [data.big]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    age.current += delta;
    const k = age.current / LIFE;
    if (k >= 1) {
      useGame.getState().removeBoom(data.id);
      return;
    }
    const scale = (data.big ? 4.2 : 2.8) * Math.sin(Math.min(1, k * 1.4) * Math.PI * 0.5);
    if (shell.current) {
      shell.current.scale.setScalar(Math.max(0.01, scale));
      (shell.current.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - k);
    }
    if (light.current) light.current.intensity = 60 * (1 - k);
    if (points.current) {
      const attr = points.current.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < velocities.length; i++) {
        attr.setXYZ(
          i,
          attr.getX(i) + velocities[i].x * delta,
          attr.getY(i) + velocities[i].y * delta * 0.6, // weak gravity drift
          attr.getZ(i) + velocities[i].z * delta
        );
      }
      attr.needsUpdate = true;
      (points.current.material as THREE.PointsMaterial).opacity = 1 - k;
    }
  });

  return (
    <group position={data.pos}>
      <pointLight ref={light} intensity={60} distance={20} color={data.color} />
      <mesh ref={shell}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color={data.color} transparent opacity={0.85} toneMapped={false} />
      </mesh>
      <points ref={points}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.22} color={data.color} transparent toneMapped={false} />
      </points>
    </group>
  );
}

export default function Explosions() {
  const booms = useGame((s) => s.booms);
  return (
    <>
      {booms.map((b) => (
        <Explosion key={b.id} data={b} />
      ))}
    </>
  );
}
