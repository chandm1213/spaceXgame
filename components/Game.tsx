'use client';

import { useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import { useGame } from '@/lib/store';
import { input } from '@/lib/world';
import Ship from './Ship';
import Environment from './Environment';
import Aliens from './Aliens';
import Asteroids from './Asteroids';
import Bolts from './Bolts';
import Crystals from './Crystals';
import Explosions from './Explosions';
import Wormhole from './Wormhole';
import { Director, CameraRig } from './Systems';
import HUD from './HUD';

export default function Game() {
  const status = useGame((s) => s.status);
  const aberration = useMemo(() => new THREE.Vector2(0.0008, 0.0008), []);

  // Global input listeners — written into the non-reactive input singleton
  useEffect(() => {
    const down = (e: KeyboardEvent) => input.keys.add(e.key.toLowerCase());
    const up = (e: KeyboardEvent) => input.keys.delete(e.key.toLowerCase());
    const mouseDown = (e: MouseEvent) => {
      if (e.button === 0) input.firing = true;
    };
    const mouseUp = (e: MouseEvent) => {
      if (e.button === 0) input.firing = false;
    };
    const blur = () => {
      input.keys.clear();
      input.firing = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('mousedown', mouseDown);
    window.addEventListener('mouseup', mouseUp);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('mousedown', mouseDown);
      window.removeEventListener('mouseup', mouseUp);
      window.removeEventListener('blur', blur);
    };
  }, []);

  const isMobileDevice = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black" style={{ touchAction: 'none' }}>
      <Canvas
        shadows
        dpr={isMobileDevice ? [1, 1.5] : [1, 1.75]}
        camera={{ position: [0, 9, 14], fov: 55, near: 0.1, far: 600 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#02020a']} />
        <fog attach="fog" args={['#02020a', 70, 220]} />

        <Environment />
        <CameraRig />

        {status !== 'menu' && (
          <>
            <Ship />
            <Aliens />
            <Asteroids />
            <Bolts />
            <Crystals />
            <Explosions />
            <Wormhole />
            <Director />
          </>
        )}

        <EffectComposer>
          <Bloom mipmapBlur intensity={1.1} luminanceThreshold={1.0} luminanceSmoothing={0.3} />
          <ChromaticAberration offset={aberration} radialModulation={false} modulationOffset={0} />
          <Vignette eskil={false} offset={0.18} darkness={0.85} />
        </EffectComposer>
      </Canvas>

      <HUD />
    </div>
  );
}
