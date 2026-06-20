'use client';

import dynamic from 'next/dynamic';

const Game = dynamic(() => import('@/components/Game'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-black">
      <div
        className="text-glow-cyan animate-pulseGlow text-xl tracking-[0.5em] text-cyan-400"
        style={{ fontFamily: 'Orbitron, sans-serif' }}
      >
        INITIALIZING FLIGHT SYSTEMS
      </div>
      <div className="mt-4 text-xs tracking-[0.3em] text-slate-500">PHOBOS ORBITAL LINK · STANDBY</div>
    </div>
  ),
});

export default function Home() {
  return <Game />;
}
