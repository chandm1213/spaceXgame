'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '@/lib/store';
import { world, WORLD_RADIUS } from '@/lib/world';
import { sfx } from '@/lib/audio';

const spawnPos = new THREE.Vector3();
const rockPos = new THREE.Vector3();
const rockVel = new THREE.Vector3();
const camTarget = new THREE.Vector3();
const lookTarget = new THREE.Vector3();
const holePos = new THREE.Vector3();

// Seconds you must survive in a zone before an escape wormhole tears open
const WORMHOLE_DELAY = 60;

/** Wave director: keeps alien pressure rising over time. */
export function Director() {
  const waveTimer = useRef(0);
  const spawnTimer = useRef(0);
  const rockTimer = useRef(0);
  const lastBossWave = useRef(0);
  const lastMotherWave = useRef(0);
  const lastDreadWave = useRef(0);
  const zoneTimer = useRef(0);
  const lastZone = useRef(1);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const game = useGame.getState();
    if (game.status !== 'playing') return;

    // Break the kill-chain when its timer runs out
    game.tickCombo();

    // Wave escalation every 28 seconds
    waveTimer.current += delta;
    if (waveTimer.current > 28) {
      waveTimer.current = 0;
      game.setWave(game.wave + 1);
    }

    // --- Escape wormhole: survive long enough and a portal opens ---
    if (game.zone !== lastZone.current) {
      // Just warped into a new zone — restart the survival clock
      lastZone.current = game.zone;
      zoneTimer.current = 0;
    }
    if (!game.wormhole) {
      zoneTimer.current += delta;
      if (zoneTimer.current > WORMHOLE_DELAY) {
        // Open it out in the dark so the pilot has to run for it
        const angle = Math.random() * Math.PI * 2;
        const radius = 70;
        holePos.set(
          THREE.MathUtils.clamp(world.shipPos.x + Math.cos(angle) * radius, -WORLD_RADIUS + 12, WORLD_RADIUS - 12),
          3,
          THREE.MathUtils.clamp(world.shipPos.z + Math.sin(angle) * radius, -WORLD_RADIUS + 12, WORLD_RADIUS - 12)
        );
        game.openWormhole(holePos);
        sfx.portal();
      }
    }

    // Mothership: a colossal carrier every fifth wave — takes the slot
    if (
      game.wave >= 5 &&
      game.wave % 5 === 0 &&
      lastMotherWave.current !== game.wave &&
      !game.aliens.some((a) => a.kind === 3)
    ) {
      lastMotherWave.current = game.wave;
      const angle = Math.random() * Math.PI * 2;
      spawnPos.set(
        world.shipPos.x + Math.cos(angle) * 75,
        6.0,
        world.shipPos.z + Math.sin(angle) * 75
      );
      game.spawnAlien(spawnPos, 3);
      sfx.mothership();
    }

    // Dreadnought: a massive capital warship every 7th wave (Mothership still takes wave 5)
    if (
      game.wave >= 7 &&
      game.wave % 7 === 0 &&
      game.wave % 5 !== 0 &&
      lastDreadWave.current !== game.wave &&
      !game.aliens.some((a) => a.kind === 4)
    ) {
      lastDreadWave.current = game.wave;
      const angle = Math.random() * Math.PI * 2;
      spawnPos.set(
        world.shipPos.x + Math.cos(angle) * 85,
        5.0,
        world.shipPos.z + Math.sin(angle) * 85
      );
      game.spawnAlien(spawnPos, 4);
      sfx.dreadnought();
    }

    // Behemoth boss every third wave (Mothership + Dreadnought take priority) — one at a time
    if (
      game.wave >= 3 &&
      game.wave % 3 === 0 &&
      game.wave % 5 !== 0 &&
      game.wave % 7 !== 0 &&
      lastBossWave.current !== game.wave &&
      !game.aliens.some((a) => a.kind === 2)
    ) {
      lastBossWave.current = game.wave;
      const angle = Math.random() * Math.PI * 2;
      spawnPos.set(
        world.shipPos.x + Math.cos(angle) * 60,
        2.4,
        world.shipPos.z + Math.sin(angle) * 60
      );
      game.spawnAlien(spawnPos, 2);
      sfx.boss();
    }

    // Keep the dark populated
    spawnTimer.current -= delta;
    const grunts = game.aliens.filter((a) => a.kind !== 2 && a.kind !== 3).length;
    // Deeper zones field more hostiles at once and lift the cap
    const zoneBoost = (game.zone - 1) * 2;
    const targetCount = Math.min(3 + game.wave * 2 + zoneBoost, 15 + (game.zone - 1) * 4);
    if (spawnTimer.current <= 0 && grunts < targetCount) {
      spawnTimer.current = Math.max(0.8, 3.2 - game.wave * 0.25);
      // Spawn just beyond the headlight's reach, biased ahead of the ship
      const angle = Math.random() * Math.PI * 2;
      const radius = 45 + Math.random() * 35;
      spawnPos.set(
        world.shipPos.x + Math.cos(angle) * radius,
        2.4,
        world.shipPos.z + Math.sin(angle) * radius
      );
      const kind: 0 | 1 = Math.random() < 0.35 + game.wave * 0.04 ? 1 : 0;
      game.spawnAlien(spawnPos, kind);
    }

    // Drifting rock hazards — meteoroids grow likelier as waves climb
    rockTimer.current -= delta;
    if (rockTimer.current <= 0 && game.asteroids.length < 7) {
      rockTimer.current = Math.max(2.2, 5.5 - game.wave * 0.3);
      // Enter from one edge, drift roughly across the ship's position
      const angle = Math.random() * Math.PI * 2;
      rockPos.set(
        world.shipPos.x + Math.cos(angle) * 95,
        2.4 + (Math.random() - 0.5) * 3,
        world.shipPos.z + Math.sin(angle) * 95
      );
      rockVel.copy(world.shipPos).sub(rockPos);
      rockVel.y = 0;
      rockVel.normalize().multiplyScalar(4 + Math.random() * 4);
      // Skew the heading so they sail past, not laser-locked onto the ship
      rockVel.applyAxisAngle(new THREE.Vector3(0, 1, 0), (Math.random() - 0.5) * 0.9);
      const big = Math.random() < 0.25 + game.wave * 0.03;
      game.spawnAsteroid(rockPos, rockVel, big);
    }
  });

  return null;
}

/** Smooth chase camera that trails the ship from behind-above. */
export function CameraRig() {
  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const cam = state.camera;
    // Speed pulls the camera back slightly for a sense of velocity
    const back = 13 + world.shipSpeed * 0.22;
    camTarget.set(
      world.shipPos.x + state.pointer.x * 2.5,
      world.shipPos.y + 8.5,
      world.shipPos.z + back
    );
    cam.position.lerp(camTarget, Math.min(1, 4.5 * delta));
    lookTarget.lerp(world.shipPos, Math.min(1, 6 * delta));
    cam.lookAt(lookTarget.x, lookTarget.y + 1, lookTarget.z - 2);
  });

  return null;
}
