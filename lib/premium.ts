// Client helpers for the premium unlock API.

export async function fetchPremium(wallet: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/premium?wallet=${encodeURIComponent(wallet)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.premium;
  } catch {
    return false;
  }
}

export interface VerifyResult {
  ok: boolean;
  premium?: boolean;
  pending?: boolean;
  error?: string;
}

export async function verifyPremium(wallet: string, signature: string): Promise<VerifyResult> {
  try {
    const res = await fetch('/api/premium', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet, signature }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 202) return { ok: false, pending: true };
    if (!res.ok) return { ok: false, error: data.error || 'verification failed' };
    return data as VerifyResult;
  } catch {
    return { ok: false, error: 'network error' };
  }
}
