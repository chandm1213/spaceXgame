'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useGame } from '@/lib/store';
import { world, input } from '@/lib/world';
import { initAudio, sfx } from '@/lib/audio';
import { music } from '@/lib/music';
import { SKINS, WEAPONS, MISSIONS } from '@/lib/loadout';
import { Leaderboard, WalletBadge } from '@/components/Leaderboard';
import { useWallet } from '@/lib/wallet';
import { PREMIUM_PRICE } from '@/lib/payment';

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    setMobile(window.matchMedia('(pointer: coarse)').matches);
  }, []);
  return mobile;
}

const RADAR_RANGE = 70;

function StatusBar({
  label,
  value,
  color,
  lowColor = '#f87171',
}: {
  label: string;
  value: number;
  color: string;
  lowColor?: string;
}) {
  const low = value < 25;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-[10px] tracking-[0.2em] text-cyan-300/80">
        <span>{label}</span>
        <span className={low ? 'animate-pulseGlow text-red-400' : ''}>{Math.ceil(value)}%</span>
      </div>
      <div className="clip-corners mt-1 h-2.5 w-36 md:w-56 border border-cyan-400/30 bg-cyan-950/40 p-px">
        <div
          className={`h-full transition-[width] duration-300 ${low ? 'animate-pulseGlow' : ''}`}
          style={{
            width: `${value}%`,
            background: `linear-gradient(90deg, ${low ? lowColor : color}66, ${low ? lowColor : color})`,
            boxShadow: `0 0 8px ${low ? lowColor : color}`,
          }}
        />
      </div>
    </div>
  );
}

function Radar() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const ctx = cv.getContext('2d')!;
    let raf = 0;
    const SIZE = 168;
    const C = SIZE / 2;

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, SIZE, SIZE);

      // Backdrop + range rings
      ctx.fillStyle = 'rgba(3, 20, 28, 0.75)';
      ctx.beginPath();
      ctx.arc(C, C, C - 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.25)';
      ctx.lineWidth = 1;
      for (const r of [C * 0.33, C * 0.66, C - 1]) {
        ctx.beginPath();
        ctx.arc(C, C, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(C, 2);
      ctx.lineTo(C, SIZE - 2);
      ctx.moveTo(2, C);
      ctx.lineTo(SIZE - 2, C);
      ctx.stroke();

      // Rotating sweep
      const sweep = (now / 900) % (Math.PI * 2);
      const grad = ctx.createConicGradient
        ? ctx.createConicGradient(sweep, C, C)
        : null;
      if (grad) {
        grad.addColorStop(0, 'rgba(34, 211, 238, 0.35)');
        grad.addColorStop(0.12, 'rgba(34, 211, 238, 0)');
        grad.addColorStop(1, 'rgba(34, 211, 238, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(C, C, C - 1, 0, Math.PI * 2);
        ctx.fill();
      }

      const { aliens, crystals, asteroids, wormhole } = useGame.getState();
      const pulse = 0.65 + 0.35 * Math.sin(now / 120);

      // Contacts — rotated so "up" is the ship's heading
      const plot = (x: number, z: number) => {
        const dx = x - world.shipPos.x;
        const dz = z - world.shipPos.z;
        const h = world.shipHeading;
        // Project onto the ship's right/forward axes so "up" = nose direction
        const right = -dx * Math.cos(h) + dz * Math.sin(h);
        const forward = dx * Math.sin(h) + dz * Math.cos(h);
        if (Math.hypot(right, forward) > RADAR_RANGE) return null;
        const scale = (C - 8) / RADAR_RANGE;
        return { px: C + right * scale, py: C - forward * scale };
      };

      for (const c of crystals) {
        const p = plot(c.pos.x, c.pos.z);
        if (!p) continue;
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(p.px - 1.5, p.py - 1.5, 3, 3);
      }
      // Rock hazards — grey diamonds
      for (const r of asteroids) {
        const p = plot(r.pos.x, r.pos.z);
        if (!p) continue;
        ctx.fillStyle = r.big ? '#f59e0b' : '#94a3b8';
        const s = r.big ? 3 : 2;
        ctx.save();
        ctx.translate(p.px, p.py);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-s, -s, s * 2, s * 2);
        ctx.restore();
      }
      ctx.globalAlpha = pulse;
      for (const a of aliens) {
        const p = plot(a.pos.x, a.pos.z);
        if (!p) continue;
        const boss = a.kind === 2;
        ctx.fillStyle = boss ? '#f43f5e' : a.kind === 0 ? '#c084fc' : '#4ade80';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = boss ? 10 : 6;
        ctx.beginPath();
        ctx.arc(p.px, p.py, boss ? 5.5 : 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;

      // Wormhole — pulsing ring, clamped to the rim with a chevron when out of range
      if (wormhole) {
        const dx = wormhole.x - world.shipPos.x;
        const dz = wormhole.z - world.shipPos.z;
        const h = world.shipHeading;
        const right = -dx * Math.cos(h) + dz * Math.sin(h);
        const forward = dx * Math.sin(h) + dz * Math.cos(h);
        const dist = Math.hypot(right, forward);
        const scale = (C - 8) / RADAR_RANGE;
        const off = dist > RADAR_RANGE;
        const px = off ? C + (right / dist) * (C - 8) : C + right * scale;
        const py = off ? C - (forward / dist) * (C - 8) : C - forward * scale;
        ctx.save();
        ctx.strokeStyle = '#c084fc';
        ctx.fillStyle = '#c084fc';
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 12;
        ctx.lineWidth = 2;
        const rr = 4.5 + Math.sin(now / 140) * 1.8;
        ctx.beginPath();
        ctx.arc(px, py, rr, 0, Math.PI * 2);
        ctx.stroke();
        if (off) {
          ctx.beginPath();
          ctx.arc(px, py, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Ship marker
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.moveTo(C, C - 5);
      ctx.lineTo(C - 4, C + 4);
      ctx.lineTo(C + 4, C + 4);
      ctx.closePath();
      ctx.fill();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="clip-corners border border-cyan-400/40 bg-cyan-950/30 p-1.5 backdrop-blur-sm">
      <canvas ref={canvas} width={168} height={168} />
      <div className="mt-1 text-center text-[9px] tracking-[0.3em] text-cyan-300/70">
        PROXIMITY RADAR
      </div>
    </div>
  );
}

function DamageFlash() {
  const hitFlash = useGame((s) => s.hitFlash);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!hitFlash) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 350);
    return () => clearTimeout(t);
  }, [hitFlash]);
  if (!visible) return null;
  return (
    <div
      className="pointer-events-none absolute inset-0 z-30"
      style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(220,38,38,0.45) 100%)' }}
    />
  );
}

function WarpFlash() {
  const warpFlash = useGame((s) => s.warpFlash);
  const zone = useGame((s) => s.zone);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!warpFlash) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 1400);
    return () => clearTimeout(t);
  }, [warpFlash]);
  if (!visible) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      <div
        className="absolute inset-0 animate-pulseGlow"
        style={{
          background:
            'radial-gradient(circle at center, rgba(168,85,247,0.55), rgba(34,211,238,0.3) 45%, transparent 78%)',
        }}
      />
      <div className="absolute left-1/2 top-1/3 -translate-x-1/2 text-center">
        <div className="text-[10px] tracking-[0.5em] text-fuchsia-300/80">WORMHOLE TRAVERSED</div>
        <div
          className="text-glow-cyan mt-1 text-4xl font-black tracking-[0.3em] text-fuchsia-100 md:text-5xl"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          ZONE {String(zone).padStart(2, '0')}
        </div>
        <div className="mt-1 text-[11px] tracking-[0.3em] text-cyan-200/80">+2000 PTS · LIFE SUPPORT RESTORED</div>
      </div>
    </div>
  );
}

function WormholePrompt() {
  const wormhole = useGame((s) => s.wormhole);
  if (!wormhole) return null;
  return (
    <div className="pointer-events-none absolute bottom-24 left-1/2 z-30 -translate-x-1/2 text-center md:bottom-28">
      <div className="clip-corners border border-fuchsia-400/50 bg-fuchsia-950/30 px-5 py-2 backdrop-blur-sm animate-pulseGlow">
        <div className="text-[10px] tracking-[0.4em] text-fuchsia-300" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          ⊘ WORMHOLE DETECTED
        </div>
        <div className="mt-0.5 text-[9px] tracking-[0.3em] text-fuchsia-200/70">
          FLY IN TO ESCAPE — TRACK IT ON RADAR
        </div>
      </div>
    </div>
  );
}

function missionProgress(index: number, s: ReturnType<typeof useGame.getState>) {
  const m = MISSIONS[index];
  if (!m) return { value: 1, target: 1 };
  const value =
    m.type === 'kills' ? s.kills
    : m.type === 'fragments' ? s.fragments
    : m.type === 'wave' ? s.wave
    : s.bossKills;
  return { value: Math.min(value, m.target), target: m.target };
}

function MissionTracker() {
  const missionIndex = useGame((s) => s.missionIndex);
  const kills = useGame((s) => s.kills);
  const fragments = useGame((s) => s.fragments);
  const wave = useGame((s) => s.wave);
  const bossKills = useGame((s) => s.bossKills);

  const allDone = missionIndex >= MISSIONS.length;
  const m = MISSIONS[Math.min(missionIndex, MISSIONS.length - 1)];
  const { value, target } = missionProgress(missionIndex, { kills, fragments, wave, bossKills } as any);
  const pct = allDone ? 100 : Math.round((value / target) * 100);

  return (
    <div className="clip-corners absolute left-1/2 top-5 -translate-x-1/2 border border-amber-400/30 bg-slate-950/55 px-5 py-2.5 text-center backdrop-blur-sm animate-flicker">
      <div className="text-[9px] tracking-[0.4em] text-amber-400/80">
        {allDone ? '◆ ALL OBJECTIVES CLEARED ◆' : `◆ OBJECTIVE ${m.id + 1}/${MISSIONS.length}`}
      </div>
      <div className="mt-1 text-sm tracking-[0.25em] text-amber-100" style={{ fontFamily: 'Orbitron, sans-serif' }}>
        {allDone ? 'FREE HUNT' : m.title}
      </div>
      <div className="mt-0.5 text-[10px] tracking-widest text-slate-400">
        {allDone ? 'Rack up the highest score you can.' : m.desc}
      </div>
      {!allDone && (
        <>
          <div className="clip-corners mx-auto mt-2 h-1.5 w-48 border border-amber-400/30 bg-amber-950/40 p-px">
            <div
              className="h-full transition-[width] duration-300"
              style={{ width: `${pct}%`, background: '#fbbf24', boxShadow: '0 0 6px #fbbf24' }}
            />
          </div>
          <div className="mt-1 text-[10px] tracking-widest text-amber-300/80">
            {value} / {target}
          </div>
        </>
      )}
    </div>
  );
}

function MissionBanner() {
  const missionFlash = useGame((s) => s.missionFlash);
  const missionIndex = useGame((s) => s.missionIndex);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!missionFlash) return;
    setShow(true);
    sfx.pickup();
    const t = setTimeout(() => setShow(false), 2800);
    return () => clearTimeout(t);
  }, [missionFlash]);
  if (!show) return null;
  const done = MISSIONS[missionIndex - 1];
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/3 z-30 -translate-x-1/2 text-center">
      <div
        className="text-glow-cyan text-3xl font-black tracking-[0.3em] text-amber-300 md:text-4xl"
        style={{ fontFamily: 'Orbitron, sans-serif' }}
      >
        OBJECTIVE COMPLETE
      </div>
      {done && (
        <div className="mt-2 text-sm tracking-[0.3em] text-cyan-200">
          {done.title} &nbsp;·&nbsp; +{done.reward} PTS
        </div>
      )}
    </div>
  );
}

function Joystick({
  label,
  onStart,
  onMove,
  onEnd,
}: {
  label: string;
  onStart?: () => void;
  onMove: (nx: number, ny: number) => void;
  onEnd: () => void;
}) {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const touchIdRef = useRef<number | null>(null);
  const RADIUS = 48;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (touchIdRef.current !== null) return;
    touchIdRef.current = e.changedTouches[0].identifier;
    onStart?.();
  }, [onStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchIdRef.current === null || !baseRef.current) return;
    let t: React.Touch | null = null;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        t = e.changedTouches[i];
        break;
      }
    }
    if (!t) return;
    const rect = baseRef.current.getBoundingClientRect();
    const dx = t.clientX - (rect.left + rect.width / 2);
    const dy = t.clientY - (rect.top + rect.height / 2);
    const len = Math.hypot(dx, dy);
    const clamp = Math.min(len, RADIUS);
    const nx = len > 0.5 ? (dx / len) * (clamp / RADIUS) : 0;
    const ny = len > 0.5 ? (dy / len) * (clamp / RADIUS) : 0;
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${nx * RADIUS}px, ${ny * RADIUS}px)`;
    }
    onMove(nx, ny);
  }, [onMove]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        touchIdRef.current = null;
        if (knobRef.current) knobRef.current.style.transform = 'translate(0px,0px)';
        onEnd();
        break;
      }
    }
  }, [onEnd]);

  const handleTouchCancel = useCallback(() => {
    touchIdRef.current = null;
    if (knobRef.current) knobRef.current.style.transform = 'translate(0px,0px)';
    onEnd();
  }, [onEnd]);

  return (
    <div
      ref={baseRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      style={{
        width: 112,
        height: 112,
        borderRadius: '50%',
        border: '2px solid rgba(34,211,238,0.25)',
        background: 'rgba(34,211,238,0.05)',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      <div
        ref={knobRef}
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'rgba(34,211,238,0.15)',
          border: '1.5px solid rgba(34,211,238,0.5)',
          boxShadow: '0 0 8px rgba(34,211,238,0.2)',
          position: 'absolute',
          transform: 'translate(0px,0px)',
        }}
      />
      <div style={{
        position: 'absolute',
        bottom: -20,
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: 8,
        letterSpacing: '0.3em',
        color: 'rgba(34,211,238,0.4)',
        whiteSpace: 'nowrap',
        fontFamily: 'monospace',
      }}>
        {label}
      </div>
    </div>
  );
}

function MobileControls() {
  const weaponId = useGame((s) => s.weaponId);
  const setWeapon = useGame((s) => s.setWeapon);

  const handleLeftMove = useCallback((nx: number, ny: number) => {
    input.touchMove.x = nx;
    input.touchMove.z = ny;
  }, []);
  const handleLeftEnd = useCallback(() => {
    input.touchMove.x = 0;
    input.touchMove.z = 0;
  }, []);
  const handleRightStart = useCallback(() => {
    input.touchFiring = true;
  }, []);
  const handleRightMove = useCallback((nx: number, ny: number) => {
    input.touchFiring = true;
    if (Math.hypot(nx, ny) > 0.08) {
      // Screen (nx=right, ny=down) maps to world heading via atan2(x, z)
      input.touchAimAngle = Math.atan2(nx, ny);
    }
  }, []);
  const handleRightEnd = useCallback(() => {
    input.touchFiring = false;
    input.touchAimAngle = null;
  }, []);

  return (
    <div className="pointer-events-auto absolute inset-0" style={{ touchAction: 'none' }}>
      {/* Weapon selector */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 88 }}>
        <div className="flex gap-1 rounded border border-cyan-400/20 bg-slate-950/70 p-1 backdrop-blur-sm">
          {WEAPONS.map((w) => {
            const active = weaponId === w.id;
            return (
              <button
                key={w.id}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  setWeapon(w.id);
                  sfx.swap();
                }}
                style={{ touchAction: 'none' }}
                className={`flex items-center gap-1.5 rounded px-2.5 py-2 ${
                  active ? 'bg-cyan-400/20' : 'opacity-50'
                }`}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: w.color, boxShadow: `0 0 5px ${w.color}` }}
                />
                <span className="text-[9px] tracking-[0.15em] text-slate-200">{w.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Joystick row */}
      <div className="absolute bottom-8 left-0 right-0 flex items-end justify-between px-6">
        {/* Left: move + boost */}
        <div className="flex flex-col items-center gap-3">
          <Joystick label="MOVE" onMove={handleLeftMove} onEnd={handleLeftEnd} />
          <button
            onTouchStart={(e) => { e.stopPropagation(); input.touchBoost = true; }}
            onTouchEnd={() => { input.touchBoost = false; }}
            onTouchCancel={() => { input.touchBoost = false; }}
            style={{ touchAction: 'none' }}
            className="clip-corners border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-[9px] tracking-[0.3em] text-amber-300 active:bg-amber-400/25"
          >
            BOOST
          </button>
        </div>

        {/* Right: aim + fire */}
        <div className="flex flex-col items-center gap-3">
          <Joystick
            label="AIM · FIRE"
            onStart={handleRightStart}
            onMove={handleRightMove}
            onEnd={handleRightEnd}
          />
          {/* Spacer to align with boost button */}
          <div style={{ height: 36 }} />
        </div>
      </div>
    </div>
  );
}

function PremiumUnlock({ onUnlocked }: { onUnlocked?: () => void }) {
  const { enabled, connected, premium, premiumLoading, buyPremium, login } = useWallet();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!enabled) return null;

  if (premium) {
    return (
      <div className="mt-6 text-center text-[11px] tracking-[0.35em] text-amber-300">
        ★ PREMIUM UNLOCKED ★
      </div>
    );
  }

  const handleBuy = async () => {
    setBusy(true);
    setMsg('Confirm the payment in your wallet…');
    const res = await buyPremium();
    setBusy(false);
    if (res.ok) {
      setMsg(null);
      onUnlocked?.();
    } else {
      setMsg(res.error || 'Purchase failed');
    }
  };

  return (
    <div className="clip-corners mt-6 flex flex-col items-center gap-2 border border-fuchsia-400/30 bg-fuchsia-950/20 px-6 py-4">
      <div className="text-[10px] tracking-[0.4em] text-fuchsia-300/80">PREMIUM ARSENAL</div>
      <div className="text-[11px] text-slate-400">
        Unlock all locked hulls &amp; weapons for{' '}
        <span className="text-amber-200">{PREMIUM_PRICE.toLocaleString()} $SPACEX</span>
      </div>
      {!connected ? (
        <button
          onClick={login}
          className="clip-corners mt-1 border border-fuchsia-400/60 bg-fuchsia-500/15 px-6 py-2 text-[11px] tracking-[0.3em] text-fuchsia-100 transition-all hover:bg-fuchsia-500/30"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          CONNECT WALLET
        </button>
      ) : (
        <button
          onClick={handleBuy}
          disabled={busy || premiumLoading}
          className="clip-corners mt-1 border border-amber-400/60 bg-amber-500/15 px-6 py-2 text-[11px] tracking-[0.3em] text-amber-100 transition-all hover:bg-amber-500/30 disabled:opacity-50"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          {busy ? 'PROCESSING…' : `UNLOCK PREMIUM`}
        </button>
      )}
      {msg && <div className="mt-1 max-w-xs text-center text-[10px] text-fuchsia-200/80">{msg}</div>}
    </div>
  );
}

function LoadoutPicker() {
  const skinId = useGame((s) => s.skinId);
  const weaponId = useGame((s) => s.weaponId);
  const setSkin = useGame((s) => s.setSkin);
  const setWeapon = useGame((s) => s.setWeapon);
  const { premium } = useWallet();

  const skinLocked = (s: (typeof SKINS)[number]) => !!s.premium && !premium;
  const weaponLocked = (w: (typeof WEAPONS)[number]) => !!w.premium && !premium;

  return (
    <div className="mt-9 flex flex-col items-center gap-5">
      <div className="flex flex-col gap-5 md:flex-row md:gap-12">
        {/* Hull skins */}
        <div>
          <div className="mb-2 text-[10px] tracking-[0.4em] text-cyan-400/70">HULL FINISH</div>
          <div className="flex gap-2">
            {SKINS.map((s) => {
              const locked = skinLocked(s);
              return (
                <button
                  key={s.id}
                  onClick={() => !locked && setSkin(s.id)}
                  title={locked ? `${s.name} — PREMIUM (locked)` : `${s.name} — ${s.tag}`}
                  className={`group relative h-12 w-12 rounded-sm border transition-all ${
                    skinId === s.id
                      ? 'border-cyan-300 ring-2 ring-cyan-400/50'
                      : 'border-slate-600 hover:border-slate-400'
                  } ${locked ? 'cursor-not-allowed' : ''}`}
                  style={{ background: `linear-gradient(135deg, ${s.hull} 55%, ${s.accent} 55%)` }}
                >
                  {locked && (
                    <span className="absolute inset-0 flex items-center justify-center rounded-sm bg-black/55 text-xs">
                      🔒
                    </span>
                  )}
                  {s.premium && !locked && (
                    <span className="absolute -right-1 -top-1 text-[9px]">★</span>
                  )}
                  {skinId === s.id && (
                    <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] tracking-[0.2em] text-cyan-300">
                      {s.name}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Weapons */}
        <div>
          <div className="mb-2 text-[10px] tracking-[0.4em] text-cyan-400/70">PRIMARY WEAPON</div>
          <div className="flex flex-wrap gap-2">
            {WEAPONS.map((w) => {
              const locked = weaponLocked(w);
              return (
                <button
                  key={w.id}
                  onClick={() => !locked && setWeapon(w.id)}
                  className={`clip-corners relative border px-3 py-2.5 text-left transition-all ${
                    weaponId === w.id
                      ? 'border-cyan-300 bg-cyan-400/15'
                      : 'border-slate-600 hover:border-slate-400'
                  } ${locked ? 'cursor-not-allowed opacity-80' : ''}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: w.color, boxShadow: `0 0 6px ${w.color}` }} />
                    <span className="text-[11px] tracking-[0.2em] text-slate-200">{w.name}</span>
                    {w.premium && <span className="text-[9px] text-amber-300">{locked ? '🔒' : '★'}</span>}
                  </div>
                  <div className="text-[8px] tracking-widest text-slate-500">
                    {locked ? 'PREMIUM' : w.tag}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <PremiumUnlock />
    </div>
  );
}

function MusicToggle() {
  const [muted, setMuted] = useState(false);
  useEffect(() => setMuted(music.isMuted()), []);
  return (
    <button
      onClick={() => {
        initAudio();
        if (!music.isRunning()) music.start();
        setMuted(music.toggleMute());
      }}
      title={muted ? 'Unmute music' : 'Mute music'}
      className="clip-corners pointer-events-auto flex h-9 w-9 items-center justify-center border border-cyan-400/40 bg-slate-950/50 text-cyan-300 backdrop-blur-sm transition-all hover:border-cyan-300 hover:bg-cyan-400/20"
    >
      <span className="text-sm leading-none">{muted ? '🔇' : '♪'}</span>
    </button>
  );
}

function WeaponReadout() {
  const weaponId = useGame((s) => s.weaponId);
  const setWeapon = useGame((s) => s.setWeapon);
  return (
    <div className="pointer-events-auto absolute bottom-5 left-1/2 -translate-x-1/2">
      <div className="clip-corners flex gap-1 border border-cyan-400/30 bg-slate-950/50 p-1.5 backdrop-blur-sm">
        {WEAPONS.map((w) => {
          const active = weaponId === w.id;
          return (
            <button
              key={w.id}
              onClick={() => {
                setWeapon(w.id);
                sfx.swap();
              }}
              className={`clip-corners flex items-center gap-1.5 px-2.5 py-1 transition-all ${
                active ? 'bg-cyan-400/20' : 'opacity-50 hover:opacity-90'
              }`}
              style={active ? { boxShadow: `inset 0 0 0 1px ${w.color}` } : undefined}
            >
              <span className="text-[10px] text-slate-500">{w.id + 1}</span>
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: w.color, boxShadow: `0 0 6px ${w.color}` }} />
              <span className="text-[10px] tracking-[0.2em] text-slate-200">{w.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Menu() {
  const start = useGame((s) => s.start);
  const highScore = useGame((s) => s.highScore);
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/70 backdrop-blur-[2px]">
      <div className="bg-grid absolute inset-0 opacity-40" />
      <div className="absolute left-5 top-5 z-10">
        <WalletBadge />
      </div>
      <div className="absolute right-5 top-5">
        <MusicToggle />
      </div>
      <div className="relative flex flex-col items-center px-6 text-center">
        <div className="text-xs tracking-[0.6em] text-cyan-400/70">PHOBOS DEEP-SURVEY INITIATIVE</div>
        <h1
          className="text-glow-cyan mt-4 text-5xl font-black tracking-[0.15em] text-cyan-100 md:text-7xl"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          STARSHIP
        </h1>
        <h2
          className="text-glow-cyan mt-1 text-2xl font-bold tracking-[0.5em] text-cyan-400 md:text-4xl"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          BLACK HORIZON
        </h2>
        <p className="mt-6 max-w-md text-sm leading-relaxed text-slate-400">
          Contact lost with Phobos Outpost VII. Your headlight is the only light for a thousand
          kilometres. Pick your hull and gun, clear the objectives, and survive the Behemoths in the dark.
        </p>

        <LoadoutPicker />

        {highScore > 0 && (
          <div className="mt-8 text-[11px] tracking-[0.4em] text-amber-300/90">
            BEST SCORE&nbsp;&nbsp;<span className="text-amber-200">{String(highScore).padStart(6, '0')}</span>
          </div>
        )}

        <button
          onClick={() => {
            initAudio();
            music.start();
            start();
          }}
          className="clip-corners group mt-6 border border-cyan-400/60 bg-cyan-400/10 px-12 py-4 text-lg tracking-[0.4em] text-cyan-300 transition-all hover:border-cyan-300 hover:bg-cyan-400/25 hover:text-white"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          LAUNCH MISSION
        </button>
        {/* Desktop controls */}
        <div className="mt-10 hidden grid-cols-2 gap-x-10 gap-y-1.5 text-[11px] tracking-widest text-slate-500 md:grid">
          <span className="text-right text-cyan-400/80">W A S D</span><span>THRUSTERS</span>
          <span className="text-right text-cyan-400/80">MOUSE</span><span>AIM NOSE</span>
          <span className="text-right text-cyan-400/80">CLICK / HOLD</span><span>FIRE WEAPON</span>
          <span className="text-right text-cyan-400/80">1 – 4</span><span>SWITCH WEAPON</span>
          <span className="text-right text-cyan-400/80">SHIFT</span><span>AFTERBURNER</span>
        </div>
        {/* Mobile controls hint */}
        <div className="mt-8 flex flex-col items-center gap-1.5 text-[11px] tracking-widest text-slate-500 md:hidden">
          <span><span className="text-cyan-400/80">LEFT STICK</span>&nbsp;&nbsp;MOVE</span>
          <span><span className="text-cyan-400/80">RIGHT STICK</span>&nbsp;&nbsp;AIM &amp; FIRE</span>
          <span><span className="text-cyan-400/80">BOOST</span>&nbsp;&nbsp;AFTERBURNER</span>
        </div>

        {/* Social + docs links */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="https://t.me/+6m_1n4OJlXtmMDNk"
            target="_blank"
            rel="noopener noreferrer"
            className="clip-corners flex items-center gap-2 border border-cyan-400/30 bg-slate-950/50 px-4 py-2 text-[10px] tracking-[0.3em] text-cyan-300/80 backdrop-blur-sm transition-all hover:border-cyan-300 hover:text-cyan-200"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.196 13.9l-2.968-.924c-.645-.204-.657-.645.136-.953l11.57-4.461c.537-.194 1.006.131.96.659z"/>
            </svg>
            TELEGRAM
          </a>
          <a
            href="https://x.com/SpaceXgamess"
            target="_blank"
            rel="noopener noreferrer"
            className="clip-corners flex items-center gap-2 border border-cyan-400/30 bg-slate-950/50 px-4 py-2 text-[10px] tracking-[0.3em] text-cyan-300/80 backdrop-blur-sm transition-all hover:border-cyan-300 hover:text-cyan-200"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.259 5.632 5.905-5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            FOLLOW ON X
          </a>
          <Link
            href="/docs"
            className="clip-corners flex items-center gap-2 border border-cyan-400/30 bg-slate-950/50 px-4 py-2 text-[10px] tracking-[0.3em] text-cyan-300/80 backdrop-blur-sm transition-all hover:border-cyan-300 hover:text-cyan-200"
          >
            FIELD MANUAL
          </Link>
        </div>

        <div className="mt-8">
          <Leaderboard />
        </div>
      </div>
    </div>
  );
}

function GameOver() {
  const { score, fragments, kills, wave, zone, bossKills, missionIndex, highScore, newRecord, start } = useGame();
  useEffect(() => {
    sfx.gameover();
  }, []);
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center overflow-y-auto bg-black/80 py-10 backdrop-blur-sm">
      <div className="absolute left-5 top-5 z-10">
        <WalletBadge />
      </div>
      <div className="absolute right-5 top-5">
        <MusicToggle />
      </div>
      <h1
        className="text-glow-red text-5xl font-black tracking-[0.2em] text-red-400 md:text-6xl"
        style={{ fontFamily: 'Orbitron, sans-serif' }}
      >
        SIGNAL LOST
      </h1>
      {newRecord ? (
        <div className="text-glow-cyan mt-3 animate-pulseGlow text-lg tracking-[0.4em] text-amber-300" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          ★ NEW RECORD ★
        </div>
      ) : (
        <div className="mt-3 text-[11px] tracking-[0.4em] text-amber-300/80">
          BEST {String(highScore).padStart(6, '0')}
        </div>
      )}
      <div className="clip-corners mt-8 grid grid-cols-2 gap-x-12 gap-y-2 border border-red-400/30 bg-red-950/20 px-10 py-6 text-sm tracking-widest">
        <span className="text-slate-400">FINAL SCORE</span>
        <span className="text-right text-cyan-300">{score}</span>
        <span className="text-slate-400">FRAGMENTS</span>
        <span className="text-right text-cyan-300">{fragments}</span>
        <span className="text-slate-400">HOSTILES DOWN</span>
        <span className="text-right text-cyan-300">{kills}</span>
        <span className="text-slate-400">BEHEMOTHS SLAIN</span>
        <span className="text-right text-cyan-300">{bossKills}</span>
        <span className="text-slate-400">OBJECTIVES CLEARED</span>
        <span className="text-right text-cyan-300">{Math.min(missionIndex, MISSIONS.length)} / {MISSIONS.length}</span>
        <span className="text-slate-400">WAVE REACHED</span>
        <span className="text-right text-cyan-300">{wave}</span>
        <span className="text-slate-400">ZONE REACHED</span>
        <span className="text-right text-fuchsia-300">{zone}</span>
      </div>
      <button
        onClick={() => {
          initAudio();
          music.start();
          start();
        }}
        className="clip-corners mt-10 border border-cyan-400/60 bg-cyan-400/10 px-10 py-3 tracking-[0.4em] text-cyan-300 transition-all hover:bg-cyan-400/25 hover:text-white"
        style={{ fontFamily: 'Orbitron, sans-serif' }}
      >
        RELAUNCH
      </button>

      {/* Social links */}
      <div className="mt-6 flex items-center gap-4">
        <a
          href="https://t.me/+6m_1n4OJlXtmMDNk"
          target="_blank"
          rel="noopener noreferrer"
          className="clip-corners flex items-center gap-2 border border-cyan-400/30 bg-slate-950/50 px-4 py-2 text-[10px] tracking-[0.3em] text-cyan-300/80 backdrop-blur-sm transition-all hover:border-cyan-300 hover:text-cyan-200"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.196 13.9l-2.968-.924c-.645-.204-.657-.645.136-.953l11.57-4.461c.537-.194 1.006.131.96.659z"/>
          </svg>
          TELEGRAM
        </a>
        <a
          href="https://x.com/SpaceXgamess"
          target="_blank"
          rel="noopener noreferrer"
          className="clip-corners flex items-center gap-2 border border-cyan-400/30 bg-slate-950/50 px-4 py-2 text-[10px] tracking-[0.3em] text-cyan-300/80 backdrop-blur-sm transition-all hover:border-cyan-300 hover:text-cyan-200"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.259 5.632 5.905-5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          FOLLOW ON X
        </a>
      </div>

      <div className="mt-6">
        <Leaderboard submitScoreValue={score} />
      </div>
    </div>
  );
}

export default function HUD() {
  const status = useGame((s) => s.status);
  const score = useGame((s) => s.score);
  const fragments = useGame((s) => s.fragments);
  const wave = useGame((s) => s.wave);
  const fuel = useGame((s) => s.fuel);
  const oxygen = useGame((s) => s.oxygen);
  const shields = useGame((s) => s.shields);
  const zone = useGame((s) => s.zone);
  const highScore = useGame((s) => s.highScore);
  const isMobile = useIsMobile();

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 font-mono"
      style={{ cursor: isMobile ? 'default' : 'crosshair' }}
    >
      {/* CRT scanline drifting down */}
      <div className="absolute inset-x-0 h-24 animate-scanline bg-gradient-to-b from-transparent via-cyan-400/[0.04] to-transparent" />

      {status === 'playing' && (
        <>
          {/* Top-left: life support */}
          <div className="clip-corners absolute left-3 top-3 border border-cyan-400/30 bg-slate-950/50 p-2.5 md:left-5 md:top-5 md:p-4 backdrop-blur-sm animate-flicker">
            <div className="mb-2 text-[9px] tracking-[0.35em] text-cyan-400 md:mb-3 md:text-[10px]">◢ LIFE SUPPORT</div>
            <StatusBar label="SHIELD" value={shields} color="#22d3ee" />
            <StatusBar label="FUEL" value={fuel} color="#fbbf24" />
            <StatusBar label="O₂" value={oxygen} color="#34d399" />
          </div>

          {/* Top-right: mission telemetry */}
          <div className="clip-corners absolute right-3 top-3 border border-cyan-400/30 bg-slate-950/50 p-2.5 text-right md:right-5 md:top-5 md:p-4 backdrop-blur-sm animate-flicker">
            <div className="mb-1.5 text-[9px] tracking-[0.35em] text-cyan-400 md:mb-2 md:text-[10px]">MISSION DATA ◣</div>
            <div className="text-2xl text-cyan-100 md:text-3xl" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              {String(score).padStart(6, '0')}
            </div>
            <div className="mt-1.5 text-[10px] tracking-widest text-slate-400 md:mt-2 md:text-[11px]">
              FRAGS <span className="text-cyan-300">{fragments}</span>
            </div>
            <div className="text-[10px] tracking-widest text-slate-400 md:text-[11px]">
              WAVE <span className="text-amber-300">{String(wave).padStart(2, '0')}</span>
            </div>
            <div className="text-[10px] tracking-widest text-slate-400 md:text-[11px]">
              ZONE <span className="text-fuchsia-300">{String(zone).padStart(2, '0')}</span>
            </div>
            <div className="mt-1 text-[10px] tracking-widest text-slate-400 md:text-[11px]">
              BEST <span className="text-amber-300/90">{String(highScore).padStart(6, '0')}</span>
            </div>
            <div className="mt-1.5 flex justify-end md:mt-2">
              <MusicToggle />
            </div>
          </div>

          {/* Bottom-right: radar (desktop only) */}
          <div className="absolute bottom-5 right-5 hidden md:block">
            <Radar />
          </div>

          {/* Top-center: mission objective */}
          <MissionTracker />
          <MissionBanner />

          {/* Wormhole escape prompt + warp transition */}
          <WormholePrompt />
          <WarpFlash />

          {/* Bottom-center: weapon readout (desktop only) */}
          {!isMobile && <WeaponReadout />}

          {/* Bottom-left: controls reminder (desktop only) */}
          <div className="absolute bottom-5 left-5 hidden text-[10px] leading-relaxed tracking-[0.25em] text-cyan-400/40 md:block">
            WASD · THRUST&nbsp;&nbsp;|&nbsp;&nbsp;MOUSE · AIM&nbsp;&nbsp;|&nbsp;&nbsp;CLICK · FIRE&nbsp;&nbsp;|&nbsp;&nbsp;1-4 · WEAPON&nbsp;&nbsp;|&nbsp;&nbsp;SHIFT · BOOST
          </div>

          {/* Corner frame brackets */}
          {(['left-3 top-3 border-l-2 border-t-2', 'right-3 top-3 border-r-2 border-t-2',
             'bottom-3 left-3 border-b-2 border-l-2', 'bottom-3 right-3 border-b-2 border-r-2'] as const).map((cls) => (
            <div key={cls} className={`absolute h-10 w-10 border-cyan-400/50 ${cls}`} />
          ))}

          <DamageFlash />

          {/* Mobile virtual controls */}
          {isMobile && <MobileControls />}
        </>
      )}

      <div className="pointer-events-auto">
        {status === 'menu' && <Menu />}
        {status === 'gameover' && <GameOver />}
      </div>
    </div>
  );
}
