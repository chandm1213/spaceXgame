'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame, AlienData } from '@/lib/store';
import { world } from '@/lib/world';
import { sfx } from '@/lib/audio';

const seekDir = new THREE.Vector3();
const dronePos = new THREE.Vector3();

const PALETTE: Record<number, { body: string; glow: string }> = {
  0: { body: '#3b0764', glow: '#c084fc' }, // Stalker
  1: { body: '#052e16', glow: '#4ade80' }, // Drone
  2: { body: '#450a0a', glow: '#fb7185' }, // Behemoth
  3: { body: '#1a0726', glow: '#e879f9' }, // Mothership
};

function Alien({ data }: { data: AlienData }) {
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const healthBar = useRef<THREE.Mesh>(null);
  const droneTimer = useRef(5);
  const coreLight = useRef<THREE.PointLight>(null);
  const ringMat = useRef<THREE.MeshStandardMaterial>(null);
  const coreMat = useRef<THREE.MeshStandardMaterial>(null);

  const isBoss = data.kind === 2;
  const isMother = data.kind === 3;
  const hasBar = isBoss || isMother;
  const bodyScale = isBoss ? 3.0 : 1;

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const g = group.current;
    if (!g) return;
    const game = useGame.getState();
    if (game.status !== 'playing') return;

    // Hostiles crawl during an OVERDRIVE supernova; the pilot stays at full speed
    const tDelta = delta * world.timeScale;
    const t = state.clock.elapsedTime + data.seed;

    // The Mothership enrages once it drops below half health
    const enraged = isMother && data.hp < data.maxHp * 0.5;

    // Seek the ship through the dark
    seekDir.copy(world.shipPos).sub(data.pos);
    seekDir.y = 0;
    const distance = seekDir.length();
    const speed = isMother
      ? (enraged ? 2.6 : 1.5) + game.wave * 0.05
      : isBoss
      ? Math.min(2.0 + game.wave * 0.12, 3.6)
      : Math.min(2.2 + game.wave * 0.35 + (data.kind === 1 ? 1.2 : 0), 7);
    if (distance > 0.001) {
      seekDir.normalize();
      // Weave sideways like a predator circling prey
      const weave = Math.sin(t * 1.7) * (hasBar ? 0.2 : 0.55);
      data.pos.x += (seekDir.x + seekDir.z * weave) * speed * tDelta;
      data.pos.z += (seekDir.z - seekDir.x * weave) * speed * tDelta;
    }
    data.pos.y = (isMother ? 6.0 : 2.4) + Math.sin(t * (isMother ? 1.3 : 2.1)) * (hasBar ? 1.0 : 0.8);

    g.position.copy(data.pos);
    g.rotation.y = isMother ? t * (enraged ? 0.9 : 0.45) : Math.atan2(seekDir.x, seekDir.z);

    // --- Mothership launches drone swarms ---
    if (isMother) {
      droneTimer.current -= tDelta;
      if (droneTimer.current <= 0) {
        droneTimer.current = enraged ? 3.2 : 5.5;
        const grunts = game.aliens.filter((a) => a.kind !== 2 && a.kind !== 3).length;
        if (grunts < 14) {
          const launch = enraged ? 3 : 2;
          for (let i = 0; i < launch; i++) {
            const a = Math.random() * Math.PI * 2;
            dronePos.set(
              data.pos.x + Math.cos(a) * 6,
              2.4,
              data.pos.z + Math.sin(a) * 6
            );
            game.spawnAlien(dronePos, 1);
          }
          sfx.swap();
        }
      }
      const c = enraged ? '#fb3b6b' : '#e879f9';
      if (coreLight.current) {
        const pulse = 0.7 + Math.sin(t * (enraged ? 9 : 4)) * 0.3;
        coreLight.current.intensity = (enraged ? 240 : 150) * pulse;
        coreLight.current.color.set(c);
      }
      // Electric energy ring crackles — fast erratic flicker
      if (ringMat.current) {
        const flick = 4 + Math.sin(t * 30) * 1.5 + Math.sin(t * 11.3) * 2;
        ringMat.current.emissiveIntensity = enraged ? flick * 1.5 : flick;
        ringMat.current.emissive.set(c);
        ringMat.current.color.set(c);
      }
      if (coreMat.current) {
        coreMat.current.emissiveIntensity = 7 + Math.sin(t * (enraged ? 12 : 5)) * 3;
        coreMat.current.emissive.set(c);
        coreMat.current.color.set(c);
      }
    }

    // Idle animation: breathing body, spinning ring, swaying tentacles
    if (inner.current && !isMother) {
      const breathe = 1 + Math.sin(t * 3.2) * 0.07;
      inner.current.scale.setScalar(breathe);
      inner.current.children.forEach((child, i) => {
        if (child.name === 'tentacle') {
          child.rotation.x = 0.35 + Math.sin(t * 4 + i * 1.3) * 0.25;
        }
      });
    }
    if (ring.current && !isMother) ring.current.rotation.z = t * 2.4;

    // Boss / Mothership health bar tracks damage and faces the camera
    if (healthBar.current) {
      healthBar.current.scale.x = Math.max(0.001, data.hp / data.maxHp);
      healthBar.current.parent!.quaternion.copy(state.camera.quaternion);
    }

    // Crashing into the ship: shield damage, hostile dies
    const crashDist = isMother ? 7.0 : isBoss ? 5.0 : 2.3;
    if (distance < crashDist) {
      game.killAlien(data.id, true);
      game.damage(isMother ? 46 : data.kind === 2 ? 38 : data.kind === 0 ? 20 : 14);
      sfx.hit();
    }
  });

  const { body: bodyColor, glow: glowColor } = PALETTE[data.kind];

  // ===== Mothership — a vast self-lit war saucer =====
  if (isMother) {
    return (
      <group ref={group} position={data.pos}>
        <pointLight ref={coreLight} position={[0, -0.6, 0]} intensity={140} distance={60} color={glowColor} />
        <group ref={inner}>
          {/* Upper hull dome */}
          <mesh castShadow position={[0, 0.5, 0]}>
            <sphereGeometry args={[2.6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={bodyColor} metalness={0.85} roughness={0.3} emissive={glowColor} emissiveIntensity={0.25} />
          </mesh>
          {/* Wide saucer rim */}
          <mesh castShadow position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[5.2, 5.2, 0.9, 48]} />
            <meshStandardMaterial color={bodyColor} metalness={0.9} roughness={0.35} emissive={glowColor} emissiveIntensity={0.2} />
          </mesh>
          {/* Tapered underbelly */}
          <mesh castShadow position={[0, -0.9, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[4.2, 2.2, 48]} />
            <meshStandardMaterial color="#0a0312" metalness={0.8} roughness={0.5} />
          </mesh>
          {/* Glowing reactor core under the hull */}
          <mesh position={[0, -1.4, 0]}>
            <sphereGeometry args={[1.0, 20, 20]} />
            <meshStandardMaterial ref={coreMat} color={glowColor} emissive={glowColor} emissiveIntensity={7} toneMapped={false} />
          </mesh>
          {/* Lens-flare disc blasting down from the core */}
          <mesh position={[0, -1.9, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[2.6, 32]} />
            <meshBasicMaterial color={glowColor} transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
          {/* Bright electric energy ring wrapping the hull (layered for glow) */}
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.35, 0]}>
            <torusGeometry args={[5.25, 0.09, 8, 96]} />
            <meshStandardMaterial ref={ringMat} color={glowColor} emissive={glowColor} emissiveIntensity={5} toneMapped={false} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.35, 0]}>
            <torusGeometry args={[5.25, 0.3, 8, 96]} />
            <meshBasicMaterial color={glowColor} transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>
          {/* Hull running-light strips — warm windows like a city in the dark */}
          {Array.from({ length: 40 }).map((_, i) => {
            const a = (i / 40) * Math.PI * 2;
            const r = 4.2 + (i % 2) * 0.55;
            return (
              <mesh key={`win-${i}`} position={[Math.cos(a) * r, 0.05, Math.sin(a) * r]}>
                <boxGeometry args={[0.12, 0.06, 0.12]} />
                <meshStandardMaterial
                  color={i % 3 === 0 ? '#67e8f9' : '#fb923c'}
                  emissive={i % 3 === 0 ? '#67e8f9' : '#fb923c'}
                  emissiveIntensity={4}
                  toneMapped={false}
                />
              </mesh>
            );
          })}
          {/* Turret pods + running lights around the rim */}
          {Array.from({ length: 10 }).map((_, i) => {
            const a = (i / 10) * Math.PI * 2;
            return (
              <group key={i} position={[Math.cos(a) * 4.7, 0.15, Math.sin(a) * 4.7]}>
                <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.32, 0.42, 0.7, 10]} />
                  <meshStandardMaterial color="#2a0b3a" metalness={0.9} roughness={0.3} />
                </mesh>
                <mesh position={[0, 0.45, 0]}>
                  <sphereGeometry args={[0.18, 10, 10]} />
                  <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={5} toneMapped={false} />
                </mesh>
              </group>
            );
          })}
        </group>

        {/* Floating health bar */}
        <group position={[0, 6.2, 0]}>
          <mesh position={[0, 0, -0.01]}>
            <planeGeometry args={[7, 0.5]} />
            <meshBasicMaterial color="#20062b" transparent opacity={0.75} toneMapped={false} />
          </mesh>
          <mesh ref={healthBar} position={[0, 0, 0]}>
            <planeGeometry args={[6.8, 0.34]} />
            <meshBasicMaterial color="#e879f9" toneMapped={false} />
          </mesh>
        </group>
      </group>
    );
  }

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
