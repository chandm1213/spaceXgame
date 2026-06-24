import { NextResponse } from 'next/server';
import { getRedis, LB_NAMES, tnyEntries, tnyBoard, tnyPot } from '@/lib/redis';
import {
  tournamentWindow,
  TOURNAMENT_FEE,
  TOURNAMENT_RAKE_BPS,
  TournamentEntry,
  TournamentInfo,
} from '@/lib/tournament';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TOP_N = 10;
const WALLET_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function shortWallet(w: string) {
  return `${w.slice(0, 4)}…${w.slice(-4)}`;
}

export async function GET(req: Request) {
  const win = tournamentWindow();
  const wallet = new URL(req.url).searchParams.get('wallet') ?? '';
  const redis = getRedis();

  const base: TournamentInfo = {
    id: win.id,
    start: win.start,
    end: win.end,
    fee: TOURNAMENT_FEE,
    pot: 0,
    prize: 0,
    entrants: 0,
    board: [],
  };
  if (!redis) return NextResponse.json(base);

  try {
    const [potRaw, entrants, raw] = await Promise.all([
      redis.get<number>(tnyPot(win.id)),
      redis.scard(tnyEntries(win.id)),
      redis.zrange(tnyBoard(win.id), 0, TOP_N - 1, { rev: true, withScores: true }) as Promise<
        (string | number)[]
      >,
    ]);

    const wallets: string[] = [];
    const scores: number[] = [];
    for (let i = 0; i < raw.length; i += 2) {
      wallets.push(String(raw[i]));
      scores.push(Number(raw[i + 1]));
    }
    const names =
      wallets.length > 0
        ? (await redis.hmget<Record<string, string>>(LB_NAMES, ...wallets)) ?? {}
        : {};
    const board: TournamentEntry[] = wallets.map((w, i) => ({
      wallet: w,
      name: (names && names[w]) || shortWallet(w),
      score: scores[i],
    }));

    const pot = Number(potRaw ?? 0);
    const prize = Math.floor((pot * (10000 - TOURNAMENT_RAKE_BPS)) / 10000);

    const info: TournamentInfo = {
      ...base,
      pot,
      prize,
      entrants: Number(entrants ?? 0),
      board,
    };

    if (WALLET_RE.test(wallet)) {
      const [entered, best] = await Promise.all([
        redis.sismember(tnyEntries(win.id), wallet),
        redis.zscore(tnyBoard(win.id), wallet),
      ]);
      info.entered = entered === 1;
      info.best = best === null ? 0 : Number(best);
    }

    return NextResponse.json(info);
  } catch (err) {
    console.error('tournament GET failed', err);
    return NextResponse.json(base);
  }
}
