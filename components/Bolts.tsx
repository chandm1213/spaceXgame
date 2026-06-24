'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame, BoltData } from '@/lib/store';
import { sfx } from '@/lib/audio';

const BOLT_LIFE = 2200; // ms

function Bolt({ data }: { data: BoltData }) {
  const mesh = useRef<THREE.Mesh>(null);
  const pierce = useRef(data.pierce);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const game = useGame.getState();
    if (game.status !== 'playing') return;

    data.pos.addScaledVector(data.dir, data.speed * delta);
    if (mesh.current) mesh.current.position.copy(data.pos);

    if (performance.now() - data.born > BOLT_LIFE) {
      game.removeBolt(data.id);
      return;
    }

    // Bounding-sphere intersection against every alien
    for (const alien of game.aliens) {
      const reach = data.radius * 1.7 + (alien.kind === 3 ? 5.2 : alien.kind === 2 ? 2.6 : 0);
      if (data.pos.distanceToSquared(alien.pos) < reach * reach) {
        alien.hp -= data.damage;
        if (alien.hp <= 0) {
          game.killAlien(alien.id, false);
          sfx.explosion();
        } else {
          sfx.hit();
        }
        if (pierce.current <= 0) {
          game.removeBolt(data.id);
          return;
        }
        pierce.current -= 1;
      }
    }

    // ...and against drifting rocks
    for (const rock of game.asteroids) {
      const reach = data.radius * 1.2 + rock.radius;
      if (data.pos.distanceToSquared(rock.pos) < reach * reach) {
        rock.hp -= data.damage;
        if (rock.hp <= 0) {
          game.destroyAsteroid(rock.id, false);
          sfx.explosion();
        } else {
          sfx.hit();
        }
        if (pierce.current <= 0) {
          game.removeBolt(data.id);
          return;
        }
        pierce.current -= 1;
      }
    }
  });

  return (
    <mesh ref={mesh} position={data.pos} scale={data.radius}>
      <sphereGeometry args={[0.18, 10, 10]} />
      <meshStandardMaterial
        color={data.color}
        emissive={data.color}
        emissiveIntensity={8}
        toneMapped={false}
      />
    </mesh>
  );
}

export default function Bolts() {
  const bolts = useGame((s) => s.bolts);
  return (
    <>
      {bolts.map((b) => (
        <Bolt key={b.id} data={b} />
      ))}
    </>
  );
}
