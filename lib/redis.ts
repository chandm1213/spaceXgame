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
