'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame, AlienData } from '@/lib/store';
import { world } from '@/lib/world';
import { sfx } from '@/lib/audio';

const seekDir = new THREE.Vector3();

const PALETTE: Record<number, { body: string; glow: string }> = {
  0: { body: '#3b0764', glow: '#c084fc' }, // Stalker
  1: { body: '#052e16', glow: '#4ade80' }, // Drone
  2: { body: '#450a0a', glow: '#fb7185' }, // Behemoth
};

function Alien({ data }: { data: AlienData }) {
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const healthBar = useRef<THREE.Mesh>(null);

  const isBoss = data.kind === 2;
  const bodyScale = isBoss ? 3.0 : 1;

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const g = group.current;
    if (!g) return;
    const game = useGame.getState();
    if (game.status !== 'playing') return;

    const t = state.clock.elapsedTime + data.seed;

    // Seek the ship through the dark
    seekDir.copy(world.shipPos).sub(data.pos);
    seekDir.y = 0;
    const distance = seekDir.length();
    const speed = isBoss
      ? Math.min(2.0 + game.wave * 0.12, 3.6)
      : Math.min(2.2 + game.wave * 0.35 + (data.kind === 1 ? 1.2 : 0), 7);
    if (distance > 0.001) {
      seekDir.normalize();
      // Weave sideways like a predator circling prey
      const weave = Math.sin(t * 1.7) * (isBoss ? 0.25 : 0.55);
      data.pos.x += (seekDir.x + seekDir.z * weave) * speed * delta;
      data.pos.z += (seekDir.z - seekDir.x * weave) * speed * delta;
    }
    data.pos.y = 2.4 + Math.sin(t * 2.1) * (isBoss ? 1.4 : 0.8);

    g.position.copy(data.pos);
    g.rotation.y = Math.atan2(seekDir.x, seekDir.z);

    // Idle animation: breathing body, spinning ring, swaying tentacles
    if (inner.current) {
      const breathe = 1 + Math.sin(t * 3.2) * 0.07;
      inner.current.scale.setScalar(breathe);
      inner.current.children.forEach((child, i) => {
        if (child.name === 'tentacle') {
          child.rotation.x = 0.35 + Math.sin(t * 4 + i * 1.3) * 0.25;
        }
      });
    }
    if (ring.current) ring.current.rotation.z = t * 2.4;

    // Boss health bar tracks damage and faces the camera
    if (healthBar.current) {
      healthBar.current.scale.x = Math.max(0.001, data.hp / data.maxHp);
      healthBar.current.parent!.quaternion.copy(state.camera.quaternion);
    }

    // Crashing into the ship: shield damage, alien dies
    const crashDist = isBoss ? 5.0 : 2.3;
    if (distance < crashDist) {
      game.killAlien(data.id, true);
      game.damage(data.kind === 2 ? 38 : data.kind === 0 ? 20 : 14);
      sfx.hit();
    }
  });

  const { body: bodyColor, glow: glowColor } = PALETTE[data.kind];

  return (
    <group ref={group} position={data.pos}>
      {/* Behemoths radiate their own hellish glow so the giant reads in the dark */}
      {isBoss && <pointLight position={[0, 1, 0]} intensity={120} distance={32} color={glowColor} />}
      <group ref={inner} scale={bodyScale}>
        {/* Body */}
        <mesh castShadow>
          <sphereGeometry args={[0.85, 20, 20]} />
          <meshStandardMaterial
            color={bodyColor}
            roughness={0.45}
            metalness={0.2}
            emissive={glowColor}
            emissiveIntensity={isBoss ? 1.3 : 0.25}
          />
        </mesh>
        {/* Eyes — visible even in pitch black */}
        {(isBoss ? [-0.4, -0.13, 0.13, 0.4] : [-0.3, 0.3]).map((x) => (
          <mesh key={x} position={[x, 0.18, 0.72]}>
            <sphereGeometry args={[0.13, 10, 10]} />
            <meshStandardMaterial
              color={glowColor}
              emissive={glowColor}
              emissiveIntensity={6}
              toneMapped={false}
            />
          </mesh>
        ))}
        {/* Tentacles */}
        {Array.from({ length: isBoss ? 8 : 5 }).map((_, i) => {
          const count = isBoss ? 8 : 5;
          const angle = (i / count) * Math.PI * 2;
          return (
            <mesh
              key={i}
              name="tentacle"
              castShadow
              position={[Math.cos(angle) * 0.45, -0.7, Math.sin(angle) * 0.45]}
              rotation={[0.35, angle, 0]}
            >
              <coneGeometry args={[0.14, 1.3, 8]} />
              <meshStandardMaterial
                color={bodyColor}
                roughness={0.5}
                emissive={glowColor}
                emissiveIntensity={0.4}
              />
            </mesh>
          );
        })}
        {/* Drones carry a rotating energy ring */}
        {data.kind === 1 && (
          <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.25, 0.05, 8, 40]} />
            <meshStandardMaterial
              color={glowColor}
              emissive={glowColor}
              emissiveIntensity={3.5}
              toneMapped={false}
            />
          </mesh>
        )}
        {/* Behemoths wear a menacing crown of spikes */}
        {isBoss && (
          <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.4, 0.12, 6, 12]} />
            <meshStandardMaterial
              color={glowColor}
              emissive={glowColor}
              emissiveIntensity={2.5}
              toneMapped={false}
            />
          </mesh>
        )}
      </group>

      {/* Boss floating health bar */}
      {isBoss && (
        <group position={[0, 5.4, 0]}>
          <mesh position={[0, 0, -0.01]}>
            <planeGeometry args={[4, 0.36]} />
            <meshBasicMaterial color="#1f0608" transparent opacity={0.7} toneMapped={false} />
          </mesh>
          <mesh ref={healthBar} position={[0, 0, 0]}>
            <planeGeometry args={[3.8, 0.24]} />
            <meshBasicMaterial color="#f43f5e" toneMapped={false} />
          </mesh>
        </group>
      )}
    </group>
  );
}

export default function Aliens() {
  const aliens = useGame((s) => s.aliens);
  return (
    <>
      {aliens.map((a) => (
        <Alien key={a.id} data={a} />
      ))}
    </>
  );
}
