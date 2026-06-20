'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame, AsteroidData } from '@/lib/store';
import { world } from '@/lib/world';
import { sfx } from '@/lib/audio';

function Asteroid({ data }: { data: AsteroidData }) {
  const group = useRef<THREE.Group>(null);
  const spin = useMemo(
    () =>
      new THREE.Vector3(
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.8
      ),
    []
  );

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const g = group.current;
    if (!g) return;
    const game = useGame.getState();
    if (game.status !== 'playing') return;

    // Drift across the field
    data.pos.addScaledVector(data.vel, delta);
    g.position.copy(data.pos);
    g.rotation.x += spin.x * delta;
    g.rotation.y += spin.y * delta;
    g.rotation.z += spin.z * delta;

    // Cull rocks that have tumbled far past the ship
    if (data.pos.distanceToSquared(world.shipPos) > 240 * 240) {
      game.removeAsteroid(data.id);
      return;
    }

    // Crash into the ship — heavy hit, rock shatters
    const crash = data.radius + 2.0;
    if (data.pos.distanceToSquared(world.shipPos) < crash * crash) {
      game.destroyAsteroid(data.id, true);
      game.damage(data.big ? 28 : 16);
      sfx.hit();
    }
  });

  const detail = data.big ? 1 : 0;
  return (
    <group ref={group} position={data.pos}>
      <mesh castShadow receiveShadow>
        <icosahedronGeometry args={[data.radius, detail]} />
        <meshStandardMaterial color="#6b6b76" roughness={0.9} metalness={0.12} flatShading />
      </mesh>
      {/* Meteoroids smoulder with an inner heat glow */}
      {data.big && (
        <mesh scale={0.96}>
          <icosahedronGeometry args={[data.radius, 0]} />
          <meshStandardMaterial
            color="#7c2d12"
            emissive="#ea580c"
            emissiveIntensity={0.6}
            roughness={1}
          />
        </mesh>
      )}
    </group>
  );
}

export default function Asteroids() {
  const asteroids = useGame((s) => s.asteroids);
  return (
    <>
      {asteroids.map((a) => (
        <Asteroid key={a.id} data={a} />
      ))}
    </>
  );
}
