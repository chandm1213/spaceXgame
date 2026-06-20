'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '@/lib/store';
import { world } from '@/lib/world';
import { sfx } from '@/lib/audio';

const spawnPos = new THREE.Vector3();
const rockPos = new THREE.Vector3();
const rockVel = new THREE.Vector3();
const camTarget = new THREE.Vector3();
const lookTarget = new THREE.Vector3();

/** Wave director: keeps alien pressure rising over time. */
export function Director() {
  const waveTimer = useRef(0);
  const spawnTimer = useRef(0);
  const rockTimer = useRef(0);
  const lastBossWave = useRef(0);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const game = useGame.getState();
    if (game.status !== 'playing') return;

    // Wave escalation every 28 seconds
    waveTimer.current += delta;
    if (waveTimer.current > 28) {
      waveTimer.current = 0;
      game.setWave(game.wave + 1);
    }

    // Behemoth boss every third wave — one at a time
    if (
      game.wave >= 3 &&
      game.wave % 3 === 0 &&
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
    const grunts = game.aliens.filter((a) => a.kind !== 2).length;
    const targetCount = Math.min(3 + game.wave * 2, 15);
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
