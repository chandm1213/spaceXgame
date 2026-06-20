'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '@/lib/store';
import { world, input, WORLD_RADIUS } from '@/lib/world';
import { SKINS, WEAPONS } from '@/lib/loadout';
import { sfx } from '@/lib/audio';

const ACCEL = 38;
const MAX_SPEED = 16;
const BOOST_SPEED = 26;
const DRAG = 3.2;

const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -2.4);
const aimPoint = new THREE.Vector3();
const moveDir = new THREE.Vector3();
const fireDir = new THREE.Vector3();
const muzzlePos = new THREE.Vector3();

export default function Ship() {
  const skinId = useGame((s) => s.skinId);
  const skin = SKINS[skinId] ?? SKINS[0];

  const group = useRef<THREE.Group>(null);
  const hull = useRef<THREE.Group>(null);
  const engineLight = useRef<THREE.PointLight>(null);
  const engineMatL = useRef<THREE.MeshStandardMaterial>(null);
  const engineMatR = useRef<THREE.MeshStandardMaterial>(null);
  const muzzleLight = useRef<THREE.PointLight>(null);
  const velocity = useMemo(() => new THREE.Vector3(), []);
  const spotTarget = useMemo(() => new THREE.Object3D(), []);
  const fireTimer = useRef(0);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const g = group.current;
    if (!g) return;
    const { status, fuel, weaponId, addBolt, drain, setWeapon } = useGame.getState();
    if (status !== 'playing') return;

    // --- Weapon hot-swap: number keys 1-4 ---
    for (let i = 0; i < WEAPONS.length; i++) {
      if (input.keys.has(String(i + 1)) && weaponId !== i) {
        setWeapon(i);
        sfx.swap();
      }
    }
    const weapon = WEAPONS[weaponId] ?? WEAPONS[0];

    // --- Twin-stick movement: WASD / arrow keys or left touch joystick ---
    moveDir.set(0, 0, 0);
    const k = input.keys;
    if (k.has('w') || k.has('arrowup')) moveDir.z -= 1;
    if (k.has('s') || k.has('arrowdown')) moveDir.z += 1;
    if (k.has('a') || k.has('arrowleft')) moveDir.x -= 1;
    if (k.has('d') || k.has('arrowright')) moveDir.x += 1;
    // Touch joystick takes over when no keyboard input
    if (moveDir.lengthSq() === 0) {
      moveDir.set(input.touchMove.x, 0, input.touchMove.z);
    }

    const boosting = (k.has('shift') || input.touchBoost) && fuel > 0;
    const thrusting = moveDir.lengthSq() > 0 && fuel > 0;
    world.thrusting = thrusting;

    if (thrusting) {
      moveDir.normalize().multiplyScalar(ACCEL * (boosting ? 1.8 : 1) * delta);
      velocity.add(moveDir);
    }
    // Drag + speed cap
    velocity.multiplyScalar(Math.max(0, 1 - DRAG * delta));
    const maxSpeed = boosting ? BOOST_SPEED : MAX_SPEED;
    if (velocity.length() > maxSpeed) velocity.setLength(maxSpeed);

    g.position.addScaledVector(velocity, delta);
    // Keep inside the playfield
    const dist = Math.hypot(g.position.x, g.position.z);
    if (dist > WORLD_RADIUS) {
      g.position.x *= WORLD_RADIUS / dist;
      g.position.z *= WORLD_RADIUS / dist;
    }
    // Gentle hover bob in Phobos' weak gravity
    g.position.y = 2.4 + Math.sin(state.clock.elapsedTime * 1.6) * 0.12;

    // --- Aim: right touch joystick → touchAimAngle; auto-aim if only moving; else mouse ---
    {
      let targetHeading: number | null = null;
      if (input.touchAimAngle !== null) {
        targetHeading = input.touchAimAngle;
      } else if (Math.hypot(input.touchMove.x, input.touchMove.z) > 0.1 && !input.firing) {
        // Auto-face movement direction when using left stick only
        targetHeading = Math.atan2(input.touchMove.x, input.touchMove.z);
      } else {
        state.raycaster.setFromCamera(state.pointer, state.camera);
        if (state.raycaster.ray.intersectPlane(groundPlane, aimPoint)) {
          targetHeading = Math.atan2(
            aimPoint.x - g.position.x,
            aimPoint.z - g.position.z
          );
        }
      }
      if (targetHeading !== null) {
        let diff = targetHeading - g.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        g.rotation.y += diff * Math.min(1, 10 * delta);
      }
    }

    // --- Banking: tilt into lateral motion, pitch with forward motion ---
    if (hull.current) {
      const sin = Math.sin(g.rotation.y);
      const cos = Math.cos(g.rotation.y);
      const lateral = velocity.x * cos - velocity.z * sin;
      const forward = velocity.x * sin + velocity.z * cos;
      hull.current.rotation.z = THREE.MathUtils.lerp(
        hull.current.rotation.z,
        -lateral * 0.028,
        8 * delta
      );
      hull.current.rotation.x = THREE.MathUtils.lerp(
        hull.current.rotation.x,
        forward * 0.012,
        8 * delta
      );
    }

    // --- Engine glow responds to throttle ---
    const throttle = thrusting ? (boosting ? 1 : 0.65) : 0.25;
    const flicker = 0.85 + Math.sin(state.clock.elapsedTime * 40) * 0.15;
    if (engineLight.current) engineLight.current.intensity = throttle * 26 * flicker;
    const emissive = 1.5 + throttle * 5 * flicker;
    if (engineMatL.current) engineMatL.current.emissiveIntensity = emissive;
    if (engineMatR.current) engineMatR.current.emissiveIntensity = emissive;

    // --- Selected cannon ---
    fireTimer.current -= delta;
    if (muzzleLight.current) {
      muzzleLight.current.intensity = Math.max(0, muzzleLight.current.intensity - 220 * delta);
    }
    if ((input.firing || input.touchFiring) && fireTimer.current <= 0) {
      fireTimer.current = weapon.cooldown;
      const base = g.rotation.y;
      const n = weapon.bolts;
      for (let i = 0; i < n; i++) {
        // Fan the volley evenly across the spread arc
        const offset = n > 1 ? (i / (n - 1) - 0.5) * weapon.spread : 0;
        const heading = base + offset;
        fireDir.set(Math.sin(heading), 0, Math.cos(heading));
        muzzlePos.copy(g.position).addScaledVector(fireDir, 2.6);
        addBolt({
          pos: muzzlePos.clone(),
          dir: fireDir.clone().normalize(),
          color: weapon.color,
          damage: weapon.damage,
          speed: weapon.speed,
          radius: weapon.radius,
          pierce: weapon.pierce,
        });
      }
      if (muzzleLight.current) {
        muzzleLight.current.color.set(weapon.color);
        muzzleLight.current.intensity = 30;
      }
      sfx.laser(weapon.id);
    }

    // --- Resource drain ---
    const fuelLoss = thrusting ? (boosting ? 3.4 : 1.6) * delta : 0.12 * delta;
    drain(fuelLoss, 0.55 * delta);

    // Publish to the shared world for camera, radar and AI
    world.shipPos.copy(g.position);
    world.shipHeading = g.rotation.y;
    world.shipSpeed = velocity.length();
  });

  return (
    <group ref={group} position={[0, 2.4, 0]}>
      {/* Headlight — the only real light source in the void */}
      <spotLight
        castShadow
        position={[0, 0.5, 2.2]}
        target={spotTarget}
        angle={0.42}
        penumbra={0.55}
        intensity={900}
        distance={90}
        decay={1.6}
        color="#dfe8ff"
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
      />
      <primitive object={spotTarget} position={[0, -1.2, 40]} />

      {/* Soft cockpit glow so the ship itself is visible */}
      <pointLight position={[0, 1.2, 0]} intensity={4} distance={8} color={skin.accent} />
      {/* Engine light */}
      <pointLight ref={engineLight} position={[0, 0.2, -3.2]} distance={14} color={skin.accent} />
      {/* Muzzle flash */}
      <pointLight ref={muzzleLight} position={[0, 0, 2.8]} intensity={0} distance={12} color="#4ade80" />

      <group ref={hull}>
        {/* Main fuselage — sleek rocket body, nose toward +Z */}
        <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.42, 0.62, 3.4, 24]} />
          <meshStandardMaterial color={skin.hull} metalness={0.85} roughness={0.32} />
        </mesh>
        {/* Nose cone */}
        <mesh castShadow position={[0, 0, 2.45]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.42, 1.5, 24]} />
          <meshStandardMaterial color={skin.nose} metalness={0.9} roughness={0.25} />
        </mesh>
        {/* Cockpit canopy */}
        <mesh position={[0, 0.46, 0.7]} rotation={[Math.PI / 2.4, 0, 0]}>
          <capsuleGeometry args={[0.28, 0.7, 8, 16]} />
          <meshStandardMaterial
            color={skin.accent}
            metalness={0.3}
            roughness={0.05}
            emissive={skin.accent}
            emissiveIntensity={1.4}
            transparent
            opacity={0.85}
          />
        </mesh>
        {/* Dorsal spine */}
        <mesh castShadow position={[0, 0.4, -0.8]}>
          <boxGeometry args={[0.18, 0.5, 1.6]} />
          <meshStandardMaterial color={skin.nose} metalness={0.8} roughness={0.4} />
        </mesh>
        {/* Swept wings */}
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh castShadow position={[side * 1.15, -0.1, -0.7]} rotation={[0, side * 0.5, side * 0.12]}>
              <boxGeometry args={[1.9, 0.08, 1.1]} />
              <meshStandardMaterial color={skin.hull} metalness={0.85} roughness={0.35} />
            </mesh>
            {/* Wingtip nav light strip */}
            <mesh position={[side * 2.0, -0.05, -1.15]}>
              <boxGeometry args={[0.1, 0.1, 0.5]} />
              <meshStandardMaterial
                color={side < 0 ? '#f87171' : '#4ade80'}
                emissive={side < 0 ? '#f87171' : '#4ade80'}
                emissiveIntensity={3}
              />
            </mesh>
            {/* Engine nacelles */}
            <mesh castShadow position={[side * 0.85, 0, -1.5]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.26, 0.34, 1.5, 16]} />
              <meshStandardMaterial color={skin.nose} metalness={0.9} roughness={0.3} />
            </mesh>
            {/* Engine exhaust glow */}
            <mesh position={[side * 0.85, 0, -2.3]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.22, 0.3, 0.25, 16]} />
              <meshStandardMaterial
                ref={side < 0 ? engineMatL : engineMatR}
                color={skin.accent}
                emissive={skin.accent}
                emissiveIntensity={3}
                toneMapped={false}
              />
            </mesh>
          </group>
        ))}
        {/* Ventral fins */}
        {[-1, 1].map((side) => (
          <mesh
            key={`fin-${side}`}
            castShadow
            position={[side * 0.3, -0.45, -1.3]}
            rotation={[0, 0, side * 0.7]}
          >
            <boxGeometry args={[0.06, 0.7, 0.9]} />
            <meshStandardMaterial color={skin.hull} metalness={0.85} roughness={0.35} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
