import { NextResponse } from 'next/server';
import { getRedis, LB_KEY, LB_NAMES } from '@/lib/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface LeaderEntry {
  wallet: string;
  name: string;
  score: number;
}

const TOP_N = 10;
// Sanity ceiling — reject obviously forged scores. Tune as the game evolves.
const MAX_SCORE = 5_000_000;
// Solana base58 addresses are 32–44 chars.
const WALLET_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function shortWallet(w: string) {
  return `${w.slice(0, 4)}…${w.slice(-4)}`;
}

// Pull the top N as [{wallet, name, score}], best first.
async function topEntries(): Promise<LeaderEntry[]> {
  const redis = getRedis();
  if (!redis) return [];
  // withScores returns a flat [member, score, member, score, ...]
  const raw = (await redis.zrange(LB_KEY, 0, TOP_N - 1, {
    rev: true,
    withScores: true,
  })) as (string | number)[];

  const wallets: string[] = [];
  const scores: number[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    wallets.push(String(raw[i]));
    scores.push(Number(raw[i + 1]));
  }
  if (wallets.length === 0) return [];

  const names = (await redis.hmget<Record<string, string>>(LB_NAMES, ...wallets)) ?? {};
  return wallets.map((wallet, i) => ({
    wallet,
    name: (names && names[wallet]) || shortWallet(wallet),
    score: scores[i],
  }));
}

export async function GET() {
  try {
    return NextResponse.json({ entries: await topEntries() });
  } catch (err) {
    console.error('leaderboard GET failed', err);
    return NextResponse.json({ entries: [], error: 'unavailable' }, { status: 200 });
  }
}

export async function POST(req: Request) {
  const redis = getRedis();
  if (!redis) {
    return NextResponse.json({ error: 'leaderboard not configured' }, { status: 503 });
  }

  let body: { wallet?: string; name?: string; score?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }

  const wallet = String(body.wallet ?? '').trim();
  const score = Math.floor(Number(body.score));
  const name = String(body.name ?? '')
    .replace(/[^\w \-.]/g, '')
    .trim()
    .slice(0, 20);

  if (!WALLET_RE.test(wallet)) {
    return NextResponse.json({ error: 'invalid wallet' }, { status: 400 });
  }
  if (!Number.isFinite(score) || score < 0 || score > MAX_SCORE) {
    return NextResponse.json({ error: 'invalid score' }, { status: 400 });
  }

  try {
    // Keep only the player's best: GT updates the score only if higher.
    await redis.zadd(LB_KEY, { gt: true }, { score, member: wallet });
    if (name) await redis.hset(LB_NAMES, { [wallet]: name });

    // 0-based rank from the top.
    const rank = await redis.zrevrank(LB_KEY, wallet);
    const best = await redis.zscore(LB_KEY, wallet);

    return NextResponse.json({
      entries: await topEntries(),
      rank: rank === null ? null : rank + 1,
      best: best === null ? score : Number(best),
    });
  } catch (err) {
    console.error('leaderboard POST failed', err);
    return NextResponse.json({ error: 'write failed' }, { status: 500 });
  }
}
