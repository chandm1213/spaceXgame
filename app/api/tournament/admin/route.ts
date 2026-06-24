import { NextResponse } from 'next/server';
import { getRedis, LB_NAMES, tnyEntries, tnyBoard, tnyPot, tnyPaid } from '@/lib/redis';
import { tournamentWindow, TOURNAMENT_RAKE_BPS, TOURNAMENT_ESCROW } from '@/lib/tournament';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Set TOURNAMENT_ADMIN_KEY in env, then call:
//   GET  /api/tournament/admin?key=...        -> last finished tournament's winner + payout
//   GET  /api/tournament/admin?key=...&id=N    -> a specific window
//   POST /api/tournament/admin { key, id }     -> mark that window paid
const ADMIN_KEY = process.env.TOURNAMENT_ADMIN_KEY;

function authed(key: string | null) {
  return !!ADMIN_KEY && key === ADMIN_KEY;
}

async function summary(id: number) {
  const redis = getRedis()!;
  const [potRaw, entrants, raw, paid] = await Promise.all([
    redis.get<number>(tnyPot(id)),
    redis.scard(tnyEntries(id)),
    redis.zrange(tnyBoard(id), 0, 9, { rev: true, withScores: true }) as Promise<(string | number)[]>,
    redis.get<string>(tnyPaid(id)),
  ]);
  const board: { wallet: string; name: string; score: number }[] = [];
  const wallets: string[] = [];
  for (let i = 0; i < raw.length; i += 2) wallets.push(String(raw[i]));
  const names = wallets.length
    ? (await redis.hmget<Record<string, string>>(LB_NAMES, ...wallets)) ?? {}
    : {};
  for (let i = 0; i < raw.length; i += 2) {
    const w = String(raw[i]);
    board.push({ wallet: w, name: (names && names[w]) || w, score: Number(raw[i + 1]) });
  }
  const pot = Number(potRaw ?? 0);
  const prize = Math.floor((pot * (10000 - TOURNAMENT_RAKE_BPS)) / 10000);
  return {
    id,
    pot,
    prize,
    rake: pot - prize,
    entrants: Number(entrants ?? 0),
    escrow: TOURNAMENT_ESCROW,
    winner: board[0] ?? null,
    payout: board[0] ? { wallet: board[0].wallet, amount: prize, asset: 'SPACEX' } : null,
    paid: paid ?? null,
    board,
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!authed(url.searchParams.get('key'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: 'not configured' }, { status: 503 });

  const idParam = url.searchParams.get('id');
  // Default to the most recently FINISHED window.
  const id = idParam !== null ? Number(idParam) : tournamentWindow().id - 1;
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'bad id' }, { status: 400 });
  return NextResponse.json(await summary(id));
}

export async function POST(req: Request) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: 'not configured' }, { status: 503 });
  let body: { key?: string; id?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }
  if (!authed(body.key ?? null)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const id = Number(body.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'bad id' }, { status: 400 });

  const sum = await summary(id);
  if (!sum.winner) return NextResponse.json({ error: 'no winner to mark' }, { status: 400 });
  await redis.set(tnyPaid(id), sum.winner.wallet);
  return NextResponse.json({ ok: true, paid: sum.winner.wallet });
}
