'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '@/lib/store';
import { world, input } from '@/lib/world';
import { sfx } from '@/lib/audio';

const SLOWMO = 0.32; // hostile time scale while the supernova rolls out
const DURATION = 1.25; // seconds the shockwave + slow-motion last
const MAX_RADIUS = 130; // how far the blast ring sweeps

// BLACK HORIZON supernova: a ground-hugging shockwave ring + blinding core
// that erupts from the ship when OVERDRIVE is unleashed.
export default function Overdrive() {
  const ring = useRef<THREE.Mesh>(null);
  const core = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const origin = useRef(new THREE.Vector3());
  const age = useRef(Infinity);
  const lastFlash = useRef(0);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const game = useGame.getState();

    // --- Trigger on SPACE when fully charged ---
    if (
      game.status === 'playing' &&
      !game.overdriveActive &&
      game.overdrive >= 100 &&
      input.keys.has(' ')
    ) {
      game.detonateOverdrive();
      sfx.overdrive();
    }

    // --- Kick off the blast when a new detonation lands ---
    if (game.overdriveFlash && game.overdriveFlash !== lastFlash.current) {
      lastFlash.current = game.overdriveFlash;
      origin.current.copy(world.shipPos);
      age.current = 0;
      world.timeScale = SLOWMO;
    }

    if (age.current >= DURATION) {
      // Idle: keep the blast meshes hidden and time at full speed
      if (ring.current) ring.current.visible = false;
      if (core.current) core.current.visible = false;
      if (light.current) light.current.intensity = 0;
      if (world.timeScale !== 1) world.timeScale = 1;
      if (game.overdriveActive) game.endOverdrive();
      return;
    }

    age.current += delta;
    const k = Math.min(1, age.current / DURATION);
    const radius = MAX_RADIUS * k * (2 - k); // ease-out sweep
    const fade = 1 - k;

    // Ease the hostiles back to full speed over the back half of the window
    world.timeScale = THREE.MathUtils.lerp(SLOWMO, 1, Math.max(0, (k - 0.5) * 2));

    if (ring.current) {
      ring.current.visible = true;
      ring.current.position.set(origin.current.x, 1.4, origin.current.z);
      ring.current.scale.setScalar(Math.max(0.01, radius));
      (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.85 * fade;
    }
    if (core.current) {
      core.current.visible = true;
      core.current.position.set(origin.current.x, 2.0, origin.current.z);
      const cs = 3 + 40 * k;
      core.current.scale.setScalar(cs);
      (core.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.9 - k * 1.4);
    }
    if (light.current) {
      light.current.position.set(origin.current.x, 3, origin.current.z);
      light.current.intensity = 900 * fade;
      light.current.distance = 40 + radius;
    }
  });

  return (
    <group>
      <pointLight ref={light} intensity={0} distance={60} color="#e879f9" />
      {/* Expanding shockwave ring on the ground plane */}
      <mesh ref={ring} visible={false} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.82, 1.0, 64]} />
        <meshBasicMaterial color="#f0abfc" transparent opacity={0} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {/* Blinding detonation core */}
      <mesh ref={core} visible={false}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial color="#fce7ff" transparent opacity={0} toneMapped={false} />
      </mesh>
    </group>
  );
}
