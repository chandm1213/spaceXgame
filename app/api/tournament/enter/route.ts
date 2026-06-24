import { NextResponse } from 'next/server';
import { Connection } from '@solana/web3.js';
import { getRedis, TNY_SIGS, tnyEntries, tnyPot } from '@/lib/redis';
import { SPACEX_MINT } from '@/lib/payment';
import { tournamentWindow, TOURNAMENT_ESCROW, TOURNAMENT_FEE } from '@/lib/tournament';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RPC =
  process.env.SOLANA_RPC_URL ||
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  'https://api.mainnet-beta.solana.com';

const WALLET_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const SIG_RE = /^[1-9A-HJ-NP-Za-km-z]{64,100}$/;

// POST { wallet, signature } -> verifies the entry-fee payment and registers
// the wallet in the current tournament.
export async function POST(req: Request) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: 'tournament not configured' }, { status: 503 });

  let body: { wallet?: string; signature?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }

  const wallet = String(body.wallet ?? '').trim();
  const signature = String(body.signature ?? '').trim();
  if (!WALLET_RE.test(wallet)) return NextResponse.json({ error: 'invalid wallet' }, { status: 400 });
  if (!SIG_RE.test(signature)) return NextResponse.json({ error: 'invalid signature' }, { status: 400 });

  const win = tournamentWindow();

  // Replay protection: a signature can register exactly one wallet.
  const sigOwner = await redis.hget<string>(TNY_SIGS, signature);
  if (sigOwner) {
    if (sigOwner === wallet) return NextResponse.json({ ok: true });
    return NextResponse.json({ error: 'signature already used' }, { status: 409 });
  }

  // Fetch + verify the on-chain payment.
  let tx;
  try {
    const connection = new Connection(RPC, 'confirmed');
    tx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed',
    });
  } catch (err) {
    console.error('tournament RPC error', err);
    return NextResponse.json({ error: 'rpc error' }, { status: 502 });
  }

  if (!tx) return NextResponse.json({ ok: false, pending: true }, { status: 202 });
  if (tx.meta?.err) return NextResponse.json({ error: 'transaction failed' }, { status: 400 });

  // The entrant must have signed.
  const signers = tx.transaction.message.accountKeys
    .filter((k) => k.signer)
    .map((k) => k.pubkey.toBase58());
  if (!signers.includes(wallet)) {
    return NextResponse.json({ error: 'wallet did not sign this transaction' }, { status: 400 });
  }

  // The escrow wallet's $SPACEX balance must have grown by >= the entry fee.
  const pre = tx.meta?.preTokenBalances ?? [];
  const post = tx.meta?.postTokenBalances ?? [];
  const postRcv = post.find((b) => b.owner === TOURNAMENT_ESCROW && b.mint === SPACEX_MINT);
  if (!postRcv) {
    return NextResponse.json({ error: 'no entry payment to escrow found' }, { status: 400 });
  }
  const preRcv = pre.find((b) => b.accountIndex === postRcv.accountIndex);
  const delta = (postRcv.uiTokenAmount.uiAmount ?? 0) - (preRcv?.uiTokenAmount.uiAmount ?? 0);
  if (delta + 1e-9 < TOURNAMENT_FEE) {
    return NextResponse.json(
      { error: `underpaid: got ${delta}, need ${TOURNAMENT_FEE}` },
      { status: 400 }
    );
  }

  // Burn the signature, register the entry, grow the pot.
  await redis.hset(TNY_SIGS, { [signature]: wallet });
  await redis.sadd(tnyEntries(win.id), wallet);
  await redis.incrbyfloat(tnyPot(win.id), TOURNAMENT_FEE);

  return NextResponse.json({ ok: true });
}
