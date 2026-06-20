// Procedural ambient soundtrack — no audio files, all synthesized on the fly.
// Slow dark-sci-fi loop: sustained pad drone + plodding bassline + sparse lead,
// with a soft pulse on the beat. Shares the AudioContext created by initAudio().
import { initAudio, getCtx } from './audio';

const MUTE_KEY = 'sbh-muted';
const STEP_MS = 430; // ~70 BPM eighth-notes
const MASTER_VOL = 0.45;

// 16-step patterns. Chord roots cycle Am – F – C – G (four steps each).
const BASS = [110, 110, 110, 110, 87.31, 87.31, 87.31, 87.31, 130.81, 130.81, 130.81, 130.81, 98, 98, 98, 98];
// Sparse melody over the changes (0 = rest), A-minor flavoured.
const LEAD = [440, 0, 523.25, 0, 0, 392, 0, 349.23, 0, 0, 392, 0, 293.66, 0, 329.63, 0];

let master: GainNode | null = null;
let droneOscs: OscillatorNode[] = [];
let timer: ReturnType<typeof setInterval> | null = null;
let step = 0;
let running = false;
let muted = typeof window !== 'undefined' && localStorage.getItem(MUTE_KEY) === '1';

function pluck(
  ctx: AudioContext,
  type: OscillatorType,
  freq: number,
  start: number,
  dur: number,
  vol: number,
  dest: AudioNode
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(vol, start + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain).connect(dest);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

function tick() {
  const ctx = getCtx();
  if (!ctx || !master) return;
  const t = ctx.currentTime + 0.06;
  const s = step % 16;

  // Bassline — warm triangle on the off-beats
  if (s % 2 === 0) pluck(ctx, 'triangle', BASS[s], t, 0.55, 0.5, master);

  // Soft heartbeat pulse on each quarter
  if (s % 4 === 0) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    osc.connect(gain).connect(master);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  // Sparse lead shimmer
  const lead = LEAD[s];
  if (lead) pluck(ctx, 'sine', lead, t, 0.7, 0.22, master);

  step += 1;
}

export const music = {
  start() {
    const ctx = initAudio();
    if (!ctx || running) return;
    running = true;

    master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.linearRampToValueAtTime(muted ? 0 : MASTER_VOL, ctx.currentTime + 2.5); // gentle fade-in
    master.connect(ctx.destination);

    // Sustained pad: a low root + fifth through a soft low-pass
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 640;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.12;
    filter.connect(droneGain).connect(master);
    [55, 82.41].forEach((f) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = f;
      osc.connect(filter);
      osc.start();
      droneOscs.push(osc);
    });

    step = 0;
    timer = setInterval(tick, STEP_MS);
  },

  stop() {
    const ctx = getCtx();
    if (timer) clearInterval(timer);
    timer = null;
    if (master && ctx) master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
    droneOscs.forEach((o) => {
      try {
        o.stop((ctx?.currentTime ?? 0) + 0.5);
      } catch {}
    });
    droneOscs = [];
    running = false;
  },

  toggleMute() {
    muted = !muted;
    if (typeof window !== 'undefined') localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    const ctx = getCtx();
    if (master && ctx) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(muted ? 0 : MASTER_VOL, ctx.currentTime + 0.3);
    }
    return muted;
  },

  isMuted() {
    return muted;
  },

  isRunning() {
    return running;
  },
};
