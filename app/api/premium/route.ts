import { NextResponse } from 'next/server';
import { Connection } from '@solana/web3.js';
import { getRedis, PREMIUM_SET, PREMIUM_SIGS } from '@/lib/redis';
import { SPACEX_MINT, PREMIUM_RECEIVER, PREMIUM_PRICE } from '@/lib/payment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RPC =
  process.env.SOLANA_RPC_URL ||
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  'https://api.mainnet-beta.solana.com';

const WALLET_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const SIG_RE = /^[1-9A-HJ-NP-Za-km-z]{64,100}$/;

// GET /api/premium?wallet=... -> { premium: boolean }
export async function GET(req: Request) {
  const wallet = new URL(req.url).searchParams.get('wallet') ?? '';
  if (!WALLET_RE.test(wallet)) return NextResponse.json({ premium: false });
  const redis = getRedis();
  if (!redis) return NextResponse.json({ premium: false });
  try {
    const member = await redis.sismember(PREMIUM_SET, wallet);
    return NextResponse.json({ premium: member === 1 });
  } catch {
    return NextResponse.json({ premium: false });
  }
}

// POST { wallet, signature } -> verifies the on-chain payment and unlocks premium.
export async function POST(req: Request) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: 'premium not configured' }, { status: 503 });

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

  // Already unlocked? Short-circuit.
  if ((await redis.sismember(PREMIUM_SET, wallet)) === 1) {
    return NextResponse.json({ ok: true, premium: true });
  }

  // Replay protection: a signature can unlock exactly one wallet.
  const sigOwner = await redis.hget<string>(PREMIUM_SIGS, signature);
  if (sigOwner && sigOwner !== wallet) {
    return NextResponse.json({ error: 'signature already used' }, { status: 409 });
  }

  // Fetch + verify the transaction on-chain.
  let tx;
  try {
    const connection = new Connection(RPC, 'confirmed');
    tx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed',
    });
  } catch (err) {
    console.error('premium RPC error', err);
    return NextResponse.json({ error: 'rpc error' }, { status: 502 });
  }

  // Not visible yet — tell the client to retry shortly.
  if (!tx) return NextResponse.json({ ok: false, pending: true }, { status: 202 });
  if (tx.meta?.err) return NextResponse.json({ error: 'transaction failed' }, { status: 400 });

  // The buyer must have signed this transaction.
  const signers = tx.transaction.message.accountKeys
    .filter((k) => k.signer)
    .map((k) => k.pubkey.toBase58());
  if (!signers.includes(wallet)) {
    return NextResponse.json({ error: 'wallet did not sign this transaction' }, { status: 400 });
  }

  // The receiver's $SPACEX balance must have increased by >= the price.
  const pre = tx.meta?.preTokenBalances ?? [];
  const post = tx.meta?.postTokenBalances ?? [];
  const postRcv = post.find((b) => b.owner === PREMIUM_RECEIVER && b.mint === SPACEX_MINT);
  if (!postRcv) {
    return NextResponse.json({ error: 'no payment to receiver found' }, { status: 400 });
  }
  const preRcv = pre.find((b) => b.accountIndex === postRcv.accountIndex);
  const before = preRcv?.uiTokenAmount.uiAmount ?? 0;
  const after = postRcv.uiTokenAmount.uiAmount ?? 0;
  const delta = after - before;

  if (delta + 1e-9 < PREMIUM_PRICE) {
    return NextResponse.json(
      { error: `underpaid: got ${delta}, need ${PREMIUM_PRICE}` },
      { status: 400 }
    );
  }

  // All checks pass — record the unlock (idempotent) and burn the signature.
  await redis.hset(PREMIUM_SIGS, { [signature]: wallet });
  await redis.sadd(PREMIUM_SET, wallet);

  return NextResponse.json({ ok: true, premium: true });
}
