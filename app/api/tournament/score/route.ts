import { NextResponse } from 'next/server';
import { getRedis, LB_NAMES, tnyEntries, tnyBoard } from '@/lib/redis';
import { tournamentWindow } from '@/lib/tournament';
import { validateRun, RunBreakdown } from '@/lib/scoring';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WALLET_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// POST { wallet, name, run } -> validates the run and records the score on the
// tournament board (best per wallet). Only paid entrants may submit.
export async function POST(req: Request) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: 'tournament not configured' }, { status: 503 });

  let body: { wallet?: string; name?: string; run?: RunBreakdown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }

  const wallet = String(body.wallet ?? '').trim();
  if (!WALLET_RE.test(wallet)) return NextResponse.json({ error: 'invalid wallet' }, { status: 400 });
  if (!body.run || typeof body.run !== 'object') {
    return NextResponse.json({ error: 'missing run' }, { status: 400 });
  }
  const name = String(body.name ?? '')
    .replace(/[^\w \-.]/g, '')
    .trim()
    .slice(0, 20);

  const win = tournamentWindow();

  // Must have paid the entry fee for this window.
  if ((await redis.sismember(tnyEntries(win.id), wallet)) !== 1) {
    return NextResponse.json({ error: 'not entered in this tournament' }, { status: 403 });
  }

  // Anti-cheat: recompute + plausibility-check the run.
  const check = validateRun(body.run);
  if (!check.ok) {
    return NextResponse.json({ error: `run rejected: ${check.reason}` }, { status: 400 });
  }
  const score = check.score;

  try {
    await redis.zadd(tnyBoard(win.id), { gt: true }, { score, member: wallet });
    if (name) await redis.hset(LB_NAMES, { [wallet]: name });
    const [rank, best] = await Promise.all([
      redis.zrevrank(tnyBoard(win.id), wallet),
      redis.zscore(tnyBoard(win.id), wallet),
    ]);
    return NextResponse.json({
      ok: true,
      score,
      rank: rank === null ? null : rank + 1,
      best: best === null ? score : Number(best),
    });
  } catch (err) {
    console.error('tournament score write failed', err);
    return NextResponse.json({ error: 'write failed' }, { status: 500 });
  }
}
