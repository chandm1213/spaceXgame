// Tournament config + window math + client API helpers.
// Entry fees are paid in $SPACEX to the escrow wallet and verified on-chain
// (same pattern as premium). Payouts to the winner are MANUAL — see /api/tournament/admin.

import { PREMIUM_RECEIVER } from './payment';
import type { RunBreakdown } from './scoring';

// Wallet that collects entry fees. Default to the premium receiver so it works
// out of the box, but a DEDICATED wallet is recommended for clean payout accounting.
export const TOURNAMENT_ESCROW =
  process.env.NEXT_PUBLIC_TOURNAMENT_ESCROW || PREMIUM_RECEIVER;

// Entry fee in whole $SPACEX tokens.
export const TOURNAMENT_FEE = Number(process.env.NEXT_PUBLIC_TOURNAMENT_FEE || '25000');

// House rake in basis points (1000 = 10%). The winner takes pot * (1 - rake).
export const TOURNAMENT_RAKE_BPS = Number(process.env.TOURNAMENT_RAKE_BPS || '1000');

// Tournament length in hours (168 = weekly).
export const TOURNAMENT_PERIOD_HOURS = Number(process.env.NEXT_PUBLIC_TOURNAMENT_PERIOD_HOURS || '168');

// Fixed anchor so windows are stable across deploys.
const EPOCH = Date.UTC(2024, 0, 1);

export interface TournamentWindow {
  id: number;
  start: number; // ms epoch
  end: number; // ms epoch
}

export function tournamentWindow(now = Date.now()): TournamentWindow {
  const periodMs = TOURNAMENT_PERIOD_HOURS * 3600 * 1000;
  const id = Math.floor((now - EPOCH) / periodMs);
  const start = EPOCH + id * periodMs;
  return { id, start, end: start + periodMs };
}

export interface TournamentEntry {
  wallet: string;
  name: string;
  score: number;
}

export interface TournamentInfo {
  id: number;
  start: number;
  end: number;
  fee: number;
  pot: number; // total $SPACEX collected
  prize: number; // payout to the winner (pot minus rake)
  entrants: number;
  board: TournamentEntry[];
  // Present when a wallet was passed
  entered?: boolean;
  best?: number;
}

// ---- Client fetch helpers ----

export async function fetchTournament(wallet?: string): Promise<TournamentInfo | null> {
  try {
    const q = wallet ? `?wallet=${encodeURIComponent(wallet)}` : '';
    const res = await fetch(`/api/tournament${q}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as TournamentInfo;
  } catch {
    return null;
  }
}

export interface EnterResult {
  ok: boolean;
  pending?: boolean;
  error?: string;
}

export async function verifyEntry(wallet: string, signature: string): Promise<EnterResult> {
  try {
    const res = await fetch('/api/tournament/enter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet, signature }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 202) return { ok: false, pending: true };
    if (!res.ok) return { ok: false, error: data.error || 'verification failed' };
    return { ok: true };
  } catch {
    return { ok: false, error: 'network error' };
  }
}

export async function submitTournamentScore(
  wallet: string,
  name: string,
  run: RunBreakdown
): Promise<{ ok: boolean; rank?: number | null; best?: number; error?: string }> {
  try {
    const res = await fetch('/api/tournament/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet, name, run }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || 'submit failed' };
    return { ok: true, rank: data.rank ?? null, best: data.best };
  } catch {
    return { ok: false, error: 'network error' };
  }
}
