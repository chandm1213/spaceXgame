'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '@/lib/store';
import { world } from '@/lib/world';
import { sfx } from '@/lib/audio';

// How close the ship must get to be pulled through
const ENTER_RADIUS = 5;

export default function Wormhole() {
  const wormhole = useGame((s) => s.wormhole);

  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);
  const ringC = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const g = group.current;
    if (!g || !wormhole) return;
    const t = state.clock.elapsedTime;

    // Churn the rings on different axes for a vortex feel
    if (ringA.current) ringA.current.rotation.z = t * 1.6;
    if (ringB.current) {
      ringB.current.rotation.z = -t * 1.1;
      ringB.current.rotation.x = t * 0.5;
    }
    if (ringC.current) {
      ringC.current.rotation.z = t * 0.8;
      ringC.current.rotation.y = t * 0.7;
    }
    if (core.current) core.current.scale.setScalar(1 + Math.sin(t * 4) * 0.08);
    if (light.current) light.current.intensity = 45 + Math.sin(t * 5) * 14;

    // Always face the camera so the vortex reads from any angle
    g.lookAt(state.camera.position);

    // Pull the ship through when it arrives
    const dx = world.shipPos.x - wormhole.x;
    const dz = world.shipPos.z - wormhole.z;
    if (dx * dx + dz * dz < ENTER_RADIUS * ENTER_RADIUS) {
      const game = useGame.getState();
      if (game.wormhole) {
        game.enterWormhole();
        sfx.warp();
      }
    }
    void delta;
  });

  if (!wormhole) return null;

  return (
    <group ref={group} position={[wormhole.x, wormhole.y, wormhole.z]}>
      <pointLight ref={light} color="#a855f7" distance={70} intensity={45} />

      {/* Glowing event-horizon disc */}
      <mesh ref={core}>
        <circleGeometry args={[2.4, 48]} />
        <meshStandardMaterial
          color="#000010"
          emissive="#22d3ee"
          emissiveIntensity={2.6}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      {/* Swirling accretion rings */}
      <mesh ref={ringA}>
        <torusGeometry args={[3, 0.28, 16, 64]} />
        <meshStandardMaterial color="#000" emissive="#a855f7" emissiveIntensity={3} toneMapped={false} />
      </mesh>
      <mesh ref={ringB}>
        <torusGeometry args={[4, 0.18, 16, 64]} />
        <meshStandardMaterial color="#000" emissive="#22d3ee" emissiveIntensity={2.6} toneMapped={false} />
      </mesh>
      <mesh ref={ringC}>
        <torusGeometry args={[5, 0.12, 16, 64]} />
        <meshStandardMaterial color="#000" emissive="#818cf8" emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
    </group>
  );
}
