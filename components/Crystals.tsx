'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame, CrystalData } from '@/lib/store';
import { world } from '@/lib/world';
import { sfx } from '@/lib/audio';

const COLLECT_RADIUS = 2.6;
const MAGNET_RADIUS = 7;

function Crystal({ data }: { data: CrystalData }) {
  const group = useRef<THREE.Group>(null);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const g = group.current;
    if (!g) return;
    const game = useGame.getState();
    if (game.status !== 'playing') return;

    const t = state.clock.elapsedTime + data.seed;

    // Tractor pull when the ship is close — the MAGNET buff vacuums from afar
    const magnet = game.buffs.magnet > performance.now();
    const radius = magnet ? 48 : MAGNET_RADIUS;
    if (data.pos.distanceToSquared(world.shipPos) < radius * radius) {
      data.pos.lerp(world.shipPos, Math.min(1, (magnet ? 7 : 4.5) * delta));
    }

    g.position.set(data.pos.x, data.pos.y + Math.sin(t * 2.4) * 0.3, data.pos.z);
    g.rotation.y = t * 1.8;

    // Check collection after lerp so the pulled position is used
    if (data.pos.distanceToSquared(world.shipPos) < COLLECT_RADIUS * COLLECT_RADIUS) {
      game.collectCrystal(data.id);
      sfx.pickup();
    }
  });

  return (
    <group ref={group} position={data.pos}>
      <mesh>
        <octahedronGeometry args={[0.42, 0]} />
        <meshStandardMaterial
          color="#22d3ee"
          emissive="#22d3ee"
          emissiveIntensity={4}
          metalness={0.4}
          roughness={0.1}
          toneMapped={false}
        />
      </mesh>
      {/* Outer halo shard */}
      <mesh rotation={[0.5, 0.8, 0]} scale={1.5}>
        <octahedronGeometry args={[0.42, 0]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.12} />
      </mesh>
    </group>
  );
}

export default function Crystals() {
  const crystals = useGame((s) => s.crystals);
  return (
    <>
      {crystals.map((c) => (
        <Crystal key={c.id} data={c} />
      ))}
    </>
  );
}
