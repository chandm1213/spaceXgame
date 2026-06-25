'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame, PowerUpData, POWER_META } from '@/lib/store';
import { world } from '@/lib/world';
import { sfx } from '@/lib/audio';

const COLLECT_RADIUS = 3.0;
const PULL_RADIUS = 9;

function PowerUp({ data }: { data: PowerUpData }) {
  const group = useRef<THREE.Group>(null);
  const meta = POWER_META[data.kind];

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const g = group.current;
    if (!g) return;
    const game = useGame.getState();
    if (game.status !== 'playing') return;

    const t = state.clock.elapsedTime + data.seed;

    // Gentle tractor pull when the ship is near
    if (data.pos.distanceToSquared(world.shipPos) < PULL_RADIUS * PULL_RADIUS) {
      data.pos.lerp(world.shipPos, Math.min(1, 3 * delta));
    }

    g.position.set(data.pos.x, data.pos.y + Math.sin(t * 2.2) * 0.35, data.pos.z);
    g.rotation.y = t * 1.4;

    if (data.pos.distanceToSquared(world.shipPos) < COLLECT_RADIUS * COLLECT_RADIUS) {
      game.collectPowerUp(data.id);
      sfx.power();
    }
  });

  return (
    <group ref={group} position={data.pos}>
      <pointLight intensity={14} distance={10} color={meta.color} />
      {/* Capsule core */}
      <mesh>
        <icosahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial
          color={meta.color}
          emissive={meta.color}
          emissiveIntensity={4.5}
          metalness={0.5}
          roughness={0.15}
          toneMapped={false}
        />
      </mesh>
      {/* Spinning containment ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.85, 0.06, 8, 32]} />
        <meshStandardMaterial color={meta.color} emissive={meta.color} emissiveIntensity={3} toneMapped={false} />
      </mesh>
      {/* Soft halo */}
      <mesh scale={1.7}>
        <icosahedronGeometry args={[0.5, 0]} />
        <meshBasicMaterial color={meta.color} transparent opacity={0.12} toneMapped={false} />
      </mesh>
    </group>
  );
}

export default function PowerUps() {
  const powerups = useGame((s) => s.powerups);
  return (
    <>
      {powerups.map((p) => (
        <PowerUp key={p.id} data={p} />
      ))}
    </>
  );
}
