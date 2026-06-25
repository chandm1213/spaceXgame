// Lightweight synthesized sound effects — no audio assets required.
let ctx: AudioContext | null = null;

export function initAudio() {
  if (!ctx && typeof window !== 'undefined') {
    ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (ctx?.state === 'suspended') ctx.resume();
  return ctx;
}

export function getCtx() {
  return ctx;
}

function tone(
  type: OscillatorType,
  freqStart: number,
  freqEnd: number,
  duration: number,
  volume: number
) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), ctx.currentTime + duration);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function noiseBurst(duration: number, volume: number, filterFreq: number) {
  if (!ctx) return;
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start();
}

// Each weapon gets a distinct muzzle voice.
const LASER_VOICES: Array<[OscillatorType, number, number, number, number]> = [
  ['sawtooth', 880, 110, 0.18, 0.12], // plasma
  ['square', 1320, 320, 0.1, 0.07], // twin ion — tighter, snappier
  ['sawtooth', 520, 90, 0.22, 0.1], // scatter — heavier
  ['sine', 1600, 120, 0.3, 0.16], // railgun — deep zap
];

export const sfx = {
  laser: (weaponId = 0) => {
    const v = LASER_VOICES[weaponId] ?? LASER_VOICES[0];
    tone(...v);
  },
  swap: () => {
    tone('square', 440, 880, 0.08, 0.1);
    setTimeout(() => tone('square', 660, 990, 0.07, 0.08), 50);
  },
  boss: () => {
    tone('sawtooth', 70, 38, 1.6, 0.35);
    noiseBurst(1.2, 0.25, 300);
  },
  explosion: () => {
    noiseBurst(0.5, 0.35, 900);
    tone('sine', 140, 30, 0.5, 0.3);
  },
  pickup: () => {
    tone('sine', 520, 1040, 0.12, 0.15);
    setTimeout(() => tone('sine', 780, 1560, 0.15, 0.12), 70);
  },
  hit: () => {
    noiseBurst(0.25, 0.3, 500);
    tone('square', 90, 40, 0.3, 0.2);
  },
  gameover: () => {
    tone('sawtooth', 220, 40, 1.4, 0.25);
    noiseBurst(1.2, 0.2, 400);
  },
  portal: () => {
    // Eerie rising hum — a wormhole tearing open
    tone('sine', 110, 440, 1.2, 0.18);
    tone('triangle', 220, 880, 1.2, 0.12);
    noiseBurst(0.8, 0.1, 800);
  },
  warp: () => {
    // Whoosh through the portal
    tone('sawtooth', 180, 1400, 0.7, 0.22);
    tone('sine', 90, 700, 0.7, 0.2);
    noiseBurst(0.7, 0.2, 1200);
  },
  mothership: () => {
    // Vast, dread, descending horn — bigger than a Behemoth
    tone('sawtooth', 52, 28, 2.4, 0.4);
    tone('square', 78, 42, 2.0, 0.18);
    noiseBurst(1.8, 0.22, 220);
  },
  power: () => {
    // Bright triumphant power-up chime — three rising notes
    tone('triangle', 520, 660, 0.1, 0.16);
    setTimeout(() => tone('triangle', 780, 880, 0.1, 0.15), 70);
    setTimeout(() => tone('square', 1040, 1320, 0.14, 0.13), 150);
  },
  overdrive: () => {
    // Charging whine snapping into a cataclysmic shockwave
    tone('sine', 220, 2200, 0.35, 0.22);
    setTimeout(() => {
      tone('sawtooth', 1400, 40, 0.9, 0.34);
      tone('sine', 320, 30, 1.1, 0.3);
      noiseBurst(0.9, 0.4, 1600);
    }, 120);
  },
};
