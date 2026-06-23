// Client-side helpers for talking to /api/leaderboard.

export interface LeaderEntry {
  wallet: string;
  name: string;
  score: number;
}

export interface SubmitResult {
  entries: LeaderEntry[];
  rank: number | null;
  best: number;
}

export async function fetchLeaderboard(): Promise<LeaderEntry[]> {
  try {
    const res = await fetch('/api/leaderboard', { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.entries) ? data.entries : [];
  } catch {
    return [];
  }
}

export async function submitScore(args: {
  wallet: string;
  name: string;
  score: number;
}): Promise<SubmitResult | null> {
  try {
    const res = await fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
    if (!res.ok) return null;
    return (await res.json()) as SubmitResult;
  } catch {
    return null;
  }
}
