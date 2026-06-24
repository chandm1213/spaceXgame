import * as THREE from 'three';

// Mutable, non-reactive game world data shared between the 3D loop and the HUD.
// Updated every frame without triggering React re-renders.
export const world = {
  shipPos: new THREE.Vector3(0, 2.4, 0),
  shipHeading: 0, // radians, 0 = facing -Z
  shipSpeed: 0,
  thrusting: false,
  // Slow-motion multiplier for hostiles. 1 = normal; drops during an
  // OVERDRIVE supernova so enemies crawl while the pilot stays fast.
  timeScale: 1,
};

// Raw input state, written by window listeners and mobile controls, read inside useFrame.
export const input = {
  keys: new Set<string>(),
  firing: false,
  // Virtual gamepad (mobile joysticks) — overrides keyboard when active
  touchMove: { x: 0, z: 0 },       // left joystick, normalized -1..1 per axis
  touchAimAngle: null as number | null, // right joystick heading (radians); null = inactive
  touchFiring: false,
  touchBoost: false,
};

let nextId = 1;
export const uid = () => nextId++;

export const WORLD_RADIUS = 140;
