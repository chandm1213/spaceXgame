// Pure, server-safe scoring + anti-cheat. No store/three imports so API routes
// can use it. The constants here MUST stay in sync with lib/store.ts.

import { MISSIONS } from './loadout';

// Points awarded per event — mirror of the values in store.ts.
const PTS = {
  grunt: 100, // stalker (0) and drone (1)
  behemoth: 750, // kind 2
  mother: 2500, // kind 3
  rockSmall: 40,
  rockBig: 120,
  crystal: 25, // == one fragment collected
  warp: 2000,
};

// The breakdown a client submits with a run. Every field is a plain counter so
// the server can recompute the canonical score and reject anything inconsistent.
export interface RunBreakdown {
  killStalker: number;
  killDrone: number;
  killBehemoth: number;
  killMother: number;
  rockSmall: number;
  rockBig: number;
  fragments: number; // crystals collected
  warps: number;
  missionIndex: number;
  // Reported run summary (cross-checked against the counters above)
  score: number;
  wave: number;
  kills: number;
  durationSec: number;
}

// Recompute the only score a run is allowed to claim from its counters.
export function scoreFromBreakdown(b: RunBreakdown): number {
  let s = 0;
  s += (b.killStalker + b.killDrone) * PTS.grunt;
  s += b.killBehemoth * PTS.behemoth;
  s += b.killMother * PTS.mother;
  s += b.rockSmall * PTS.rockSmall + b.rockBig * PTS.rockBig;
  s += b.fragments * PTS.crystal;
  s += b.warps * PTS.warp;
  for (let i = 0; i < Math.min(b.missionIndex, MISSIONS.length); i++) s += MISSIONS[i].reward;
  return s;
}

const isNum = (n: unknown) => typeof n === 'number' && Number.isFinite(n);

export interface RunCheck {
  ok: boolean;
  reason?: string;
  score: number; // the canonical (recomputed) score
}

// Pragmatic anti-cheat: the submitted score must equal the score recomputed from
// the counters, and the counters must be physically plausible for the run time.
// This is a coarse automated filter — winners are still reviewed before payout.
export function validateRun(b: RunBreakdown): RunCheck {
  const counters = [
    b.killStalker, b.killDrone, b.killBehemoth, b.killMother,
    b.rockSmall, b.rockBig, b.fragments, b.warps, b.missionIndex,
    b.score, b.wave, b.kills, b.durationSec,
  ];
  if (!counters.every(isNum) || counters.some((n) => n < 0)) {
    return { ok: false, reason: 'malformed run', score: 0 };
  }

  const expected = scoreFromBreakdown(b);
  if (Math.abs(b.score - expected) > 5) {
    return { ok: false, reason: 'score does not match counters', score: expected };
  }

  const dur = b.durationSec;
  if (dur < 8 || dur > 6 * 3600) {
    return { ok: false, reason: 'implausible run length', score: expected };
  }

  const totalKills = b.killStalker + b.killDrone + b.killBehemoth + b.killMother;
  if (Math.abs(totalKills - b.kills) > 2) {
    return { ok: false, reason: 'kill count mismatch', score: expected };
  }
  // No one clears more than ~10 hostiles/sec sustained (OVERDRIVE included).
  if (totalKills > 15 + dur * 10) {
    return { ok: false, reason: 'too many kills for the time', score: expected };
  }
  if (b.fragments > 25 + dur * 12) {
    return { ok: false, reason: 'too many fragments for the time', score: expected };
  }
  // Waves tick ~every 28s, +2 per warp. Generous bound.
  if (b.wave > 6 + dur / 14 + b.warps * 3) {
    return { ok: false, reason: 'wave too high for the time', score: expected };
  }
  // Behemoth every 3rd wave, Mothership every 5th — bosses can't exceed the wave count.
  if (b.killBehemoth + b.killMother > b.wave) {
    return { ok: false, reason: 'too many bosses for the wave', score: expected };
  }

  return { ok: true, score: expected };
}
