import { Redis } from '@upstash/redis';

// Single shared Upstash Redis client, built from env on the server.
// Requires UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.
// Returns null when not configured so API routes can degrade gracefully
// instead of crashing the whole app during local dev.
let client: Redis | null = null;

export function getRedis(): Redis | null {
  if (client) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  client = new Redis({ url, token });
  return client;
}

// Sorted set of best scores (member = wallet, score = best score).
export const LB_KEY = 'sbh:leaderboard';
// Hash of wallet -> display name.
export const LB_NAMES = 'sbh:names';
// Set of wallets that have unlocked premium.
export const PREMIUM_SET = 'sbh:premium';
// Hash of used payment signatures -> wallet (replay protection).
export const PREMIUM_SIGS = 'sbh:premium:sigs';

// --- Tournament keys (per tournament window id) ---
// Set of wallets that paid the entry fee for this tournament.
export const tnyEntries = (id: number) => `sbh:tny:${id}:entries`;
// Sorted set of validated best scores (member = wallet, score = best).
export const tnyBoard = (id: number) => `sbh:tny:${id}:board`;
// Running total of entry fees collected (whole $SPACEX), drives the pot.
export const tnyPot = (id: number) => `sbh:tny:${id}:pot`;
// Flag/record that the winner has been paid out (manual payout).
export const tnyPaid = (id: number) => `sbh:tny:${id}:paid`;
// Hash of used entry-payment signatures -> wallet (replay protection, global).
export const TNY_SIGS = 'sbh:tny:sigs';
