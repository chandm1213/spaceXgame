'use client';

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
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
  4: { body: '#060f1a', glow: '#06b6d4' }, // Dreadnought
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

// ===== Dreadnought — massive angular cyan warship =====
const DREAD_GLOW = '#06b6d4';
const DREAD_BODY = '#060f1a';
const DREAD_ENRAGE_HP = 0.3; // 30% HP
const DREAD_CRASH_DIST = 8.5;
const DREAD_TORP_SPEED = 9;
const DREAD_TORP_DMG = 22;
const DREAD_TORP_LIFE = 4.0;

const dreadSeek = new THREE.Vector3();

function Dreadnought({ data }: { data: AlienData }) {
  const group = useRef<THREE.Group>(null);
  const coreLight = useRef<THREE.PointLight>(null);
  const healthBar = useRef<THREE.Mesh>(null);
  const eng0 = useRef<THREE.MeshBasicMaterial>(null);
  const eng1 = useRef<THREE.MeshBasicMaterial>(null);
  const eng2 = useRef<THREE.MeshBasicMaterial>(null);
  const eng3 = useRef<THREE.MeshBasicMaterial>(null);

  const torpScene = useRef<THREE.Group | null>(null);
  const torpData = useRef<{ mesh: THREE.Mesh; pos: THREE.Vector3; vel: THREE.Vector3; born: number }[]>([]);
  const torpGeo = useRef<THREE.SphereGeometry | null>(null);
  const torpMat = useRef<THREE.MeshBasicMaterial | null>(null);
  const torpFireTimer = useRef(3.5);

  const { scene } = useThree();

  useEffect(() => {
    const g = new THREE.Group();
    scene.add(g);
    torpScene.current = g;
    return () => {
      torpData.current.forEach((t) => g.remove(t.mesh));
      scene.remove(g);
      torpGeo.current?.dispose();
      torpMat.current?.dispose();
      torpData.current = [];
    };
  }, [scene]);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const g = group.current;
    if (!g) return;
    const game = useGame.getState();
    if (game.status !== 'playing') return;

    const tDelta = delta * world.timeScale;
    const t = state.clock.elapsedTime + data.seed;
    const enraged = data.hp < data.maxHp * DREAD_ENRAGE_HP;

    dreadSeek.copy(world.shipPos).sub(data.pos);
    dreadSeek.y = 0;
    const distance = dreadSeek.length();
    const speed = enraged ? 3.1 : Math.min(1.8 + game.wave * 0.04, 2.8);
    if (distance > 0.001) {
      dreadSeek.normalize();
      const weave = Math.sin(t * 0.9) * 0.12;
      data.pos.x += (dreadSeek.x + dreadSeek.z * weave) * speed * tDelta;
      data.pos.z += (dreadSeek.z - dreadSeek.x * weave) * speed * tDelta;
    }
    data.pos.y = 5.0 + Math.sin(t * 1.0) * 0.7;

    g.position.copy(data.pos);
    if (distance > 0.001) g.rotation.y = Math.atan2(dreadSeek.x, dreadSeek.z);
    g.rotation.z = Math.sin(t * 0.9) * 0.06;

    // Core light: cyan, red-orange when enraged
    if (coreLight.current) {
      const c = enraged ? '#ff5520' : DREAD_GLOW;
      const pulse = 0.7 + Math.sin(t * (enraged ? 9 : 3)) * 0.3;
      coreLight.current.color.set(c);
      coreLight.current.intensity = (enraged ? 300 : 190) * pulse;
    }

    // Engine exhaust colours
    const engColor = enraged ? '#ff6040' : DREAD_GLOW;
    const engPulse = 0.65 + Math.sin(t * 4) * 0.35;
    for (const mat of [eng0.current, eng1.current, eng2.current, eng3.current]) {
      if (!mat) continue;
      mat.color.set(engColor);
      mat.opacity = engPulse;
    }

    // Health bar faces camera
    if (healthBar.current) {
      healthBar.current.scale.x = Math.max(0.001, data.hp / data.maxHp);
      healthBar.current.parent!.quaternion.copy(state.camera.quaternion);
    }

    // ── Torpedo system ──
    const tg = torpScene.current;
    if (tg) {
      torpFireTimer.current -= tDelta;
      if (torpFireTimer.current <= 0) {
        torpFireTimer.current = enraged ? 1.8 : 4.0;
        if (!torpGeo.current) torpGeo.current = new THREE.SphereGeometry(0.38, 8, 8);
        if (!torpMat.current)
          torpMat.current = new THREE.MeshBasicMaterial({
            color: DREAD_GLOW,
            toneMapped: false,
          });
        const mesh = new THREE.Mesh(torpGeo.current, torpMat.current);
        // Fire from the torpedo pod positions (in local space → world space)
        const offset = new THREE.Vector3(0, 0, 2.2).applyEuler(g.rotation);
        mesh.position.copy(data.pos).add(offset);
        tg.add(mesh);
        const vel = world.shipPos.clone().sub(mesh.position);
        vel.y = 0;
        vel.normalize().multiplyScalar(DREAD_TORP_SPEED);
        torpData.current.push({ mesh, pos: mesh.position, vel, born: performance.now() });
        sfx.torp();
      }

      const now = performance.now();
      torpData.current = torpData.current.filter((t) => {
        const age = (now - t.born) / 1000;
        if (age > DREAD_TORP_LIFE) {
          tg.remove(t.mesh);
          return false;
        }
        t.pos.addScaledVector(t.vel, tDelta);
        if (t.pos.distanceTo(world.shipPos) < 2.5) {
          tg.remove(t.mesh);
          game.damage(DREAD_TORP_DMG);
          sfx.hit();
          return false;
        }
        return true;
      });
    }

    // Crash detection
    if (distance < DREAD_CRASH_DIST) {
      game.killAlien(data.id, true);
      game.damage(60);
      sfx.hit();
    }
  });

  const ENGINES: [number, number][] = [[-1.0, 0], [1.0, 0], [-2.8, 0], [2.8, 0]];
  const engRefs = [eng0, eng1, eng2, eng3];

  return (
    <group ref={group} position={data.pos}>
      <pointLight ref={coreLight} position={[0, 0.5, -1]} intensity={190} distance={90} color={DREAD_GLOW} />

      {/* Main elongated hull */}
      <mesh castShadow>
        <boxGeometry args={[2.5, 1.0, 9.0]} />
        <meshStandardMaterial color={DREAD_BODY} metalness={0.92} roughness={0.18} emissive={DREAD_GLOW} emissiveIntensity={0.12} />
      </mesh>

      {/* Bow nosecone — points toward the player (+Z) */}
      <mesh castShadow position={[0, 0, 4.75]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[1.25, 1.5, 8]} />
        <meshStandardMaterial color={DREAD_BODY} metalness={0.95} roughness={0.15} emissive={DREAD_GLOW} emissiveIntensity={0.08} />
      </mesh>

      {/* Command bridge on top */}
      <mesh castShadow position={[0, 1.0, -0.6]}>
        <boxGeometry args={[2.0, 0.85, 3.2]} />
        <meshStandardMaterial color={DREAD_BODY} metalness={0.9} roughness={0.22} emissive={DREAD_GLOW} emissiveIntensity={0.2} />
      </mesh>
      {/* Bridge viewport windows */}
      {([-0.5, 0, 0.5] as const).map((z, i) => (
        <mesh key={i} position={[1.01, 1.0, -0.6 + z]}>
          <boxGeometry args={[0.02, 0.22, 0.28]} />
          <meshBasicMaterial color="#67e8f9" toneMapped={false} />
        </mesh>
      ))}

      {/* Left wing */}
      <mesh castShadow position={[-3.5, -0.15, -1.5]} rotation={[0, 0, 0.1]}>
        <boxGeometry args={[5.0, 0.28, 6.8]} />
        <meshStandardMaterial color={DREAD_BODY} metalness={0.9} roughness={0.2} emissive={DREAD_GLOW} emissiveIntensity={0.09} />
      </mesh>
      {/* Right wing */}
      <mesh castShadow position={[3.5, -0.15, -1.5]} rotation={[0, 0, -0.1]}>
        <boxGeometry args={[5.0, 0.28, 6.8]} />
        <meshStandardMaterial color={DREAD_BODY} metalness={0.9} roughness={0.2} emissive={DREAD_GLOW} emissiveIntensity={0.09} />
      </mesh>

      {/* Cyan energy stripe along each wing leading edge */}
      <mesh position={[-3.5, -0.01, 2.0]}>
        <boxGeometry args={[4.5, 0.06, 0.18]} />
        <meshBasicMaterial color={DREAD_GLOW} transparent opacity={0.7} toneMapped={false} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh position={[3.5, -0.01, 2.0]}>
        <boxGeometry args={[4.5, 0.06, 0.18]} />
        <meshBasicMaterial color={DREAD_GLOW} transparent opacity={0.7} toneMapped={false} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* Torpedo launcher pods (fired from these positions) */}
      {([-1.4, 1.4] as const).map((x, i) => (
        <group key={i} position={[x, 0.25, 2.0]}>
          <mesh castShadow>
            <boxGeometry args={[0.65, 0.55, 1.3]} />
            <meshStandardMaterial color="#040c14" metalness={0.95} roughness={0.18} emissive={DREAD_GLOW} emissiveIntensity={0.4} />
          </mesh>
          {/* Barrel */}
          <mesh castShadow position={[0, 0, 0.75]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.13, 0.13, 1.1, 8]} />
            <meshStandardMaterial color="#020a10" metalness={0.98} roughness={0.1} />
          </mesh>
        </group>
      ))}

      {/* Engine nacelles — 4 at the rear (-Z) */}
      {ENGINES.map(([x], i) => (
        <group key={i} position={[x, -0.2, -5.3]}>
          <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.48, 0.58, 1.9, 12]} />
            <meshStandardMaterial color={DREAD_BODY} metalness={0.9} roughness={0.25} />
          </mesh>
          {/* Glowing exhaust sphere */}
          <mesh position={[0, 0, -1.0]}>
            <sphereGeometry args={[0.4, 8, 8]} />
            <meshBasicMaterial
              ref={engRefs[i]}
              color={DREAD_GLOW}
              transparent
              opacity={0.9}
              toneMapped={false}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}

      {/* Wing running lights */}
      {Array.from({ length: 6 }).map((_, i) => {
        const side = i < 3 ? -1 : 1;
        const zi = i % 3;
        return (
          <mesh key={i} position={[side * (2.2 + zi * 0.9), -0.16, -0.5 + zi * 0.6]}>
            <sphereGeometry args={[0.08, 6, 6]} />
            <meshBasicMaterial color={zi === 0 ? '#67e8f9' : '#fb923c'} toneMapped={false} />
          </mesh>
        );
      })}

      {/* Floating health bar */}
      <group position={[0, 8.2, 0]}>
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[10, 0.58]} />
          <meshBasicMaterial color="#051218" transparent opacity={0.8} toneMapped={false} />
        </mesh>
        <mesh ref={healthBar} position={[0, 0, 0]}>
          <planeGeometry args={[9.7, 0.4]} />
          <meshBasicMaterial color={DREAD_GLOW} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

export default function Aliens() {
  const aliens = useGame((s) => s.aliens);
  return (
    <>
      {aliens.filter((a) => a.kind !== 4).map((a) => (
        <Alien key={a.id} data={a} />
      ))}
      {aliens.filter((a) => a.kind === 4).map((a) => (
        <Dreadnought key={a.id} data={a} />
      ))}
    </>
  );
}
