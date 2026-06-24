'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGame } from '@/lib/store';
import { useWallet } from '@/lib/wallet';
import {
  fetchTournament,
  verifyEntry,
  submitTournamentScore,
  TournamentInfo,
  TOURNAMENT_FEE,
  TOURNAMENT_ESCROW,
} from '@/lib/tournament';

function useCountdown(end: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(0, end - now);
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`;
}

const fmt = (n: number) => n.toLocaleString();

/** Tournament card for the main menu: pot, countdown, entry, live board. */
export function TournamentPanel() {
  const { enabled, connected, address, login, sendAsset } = useWallet();
  const [info, setInfo] = useState<TournamentInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(() => {
    fetchTournament(address ?? undefined).then(setInfo);
  }, [address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const countdown = useCountdown(info?.end ?? Date.now());

  if (!enabled) return null;

  const entered = !!info?.entered;

  const handleEnter = async () => {
    setBusy(true);
    setMsg('Confirm the entry fee in your wallet…');
    const sent = await sendAsset({ to: TOURNAMENT_ESCROW, amount: TOURNAMENT_FEE, asset: 'SPACEX' });
    if (!sent.ok || !sent.signature) {
      setBusy(false);
      setMsg(sent.error || 'payment cancelled');
      return;
    }
    setMsg('Verifying entry on-chain…');
    for (let i = 0; i < 10; i++) {
      const res = await verifyEntry(address!, sent.signature);
      if (res.ok) {
        setBusy(false);
        setMsg(null);
        refresh();
        return;
      }
      if (res.pending) {
        await new Promise((r) => setTimeout(r, 2500));
        continue;
      }
      setBusy(false);
      setMsg(res.error || 'verification failed');
      return;
    }
    setBusy(false);
    setMsg('Still confirming — reopen the menu in a moment.');
  };

  return (
    <div className="clip-corners w-full max-w-md border border-amber-400/30 bg-amber-950/10 px-6 py-5 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="text-[10px] tracking-[0.4em] text-amber-300/80" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          ◆ WEEKLY TOURNAMENT
        </div>
        <div className="text-[10px] tracking-[0.2em] text-slate-400">ENDS IN {countdown}</div>
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <div className="text-[9px] tracking-[0.3em] text-slate-500">WINNER TAKES</div>
          <div className="text-glow-cyan text-3xl font-black text-amber-200" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            {fmt(info?.prize ?? 0)}
          </div>
          <div className="text-[9px] tracking-[0.3em] text-amber-300/70">$SPACEX</div>
        </div>
        <div className="text-right text-[10px] tracking-widest text-slate-400">
          <div>{info?.entrants ?? 0} PILOTS</div>
          <div>ENTRY {fmt(TOURNAMENT_FEE)} $SPACEX</div>
        </div>
      </div>

      {/* Entry / status */}
      <div className="mt-4">
        {!connected ? (
          <button
            onClick={login}
            className="clip-corners w-full border border-amber-400/60 bg-amber-500/15 py-2.5 text-[11px] tracking-[0.3em] text-amber-100 transition-all hover:bg-amber-500/30"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            CONNECT WALLET TO ENTER
          </button>
        ) : entered ? (
          <div className="clip-corners border border-emerald-400/40 bg-emerald-950/20 py-2 text-center text-[11px] tracking-[0.3em] text-emerald-300">
            ✓ ENTERED — YOUR RUNS COUNT
            {info?.best ? <span className="text-emerald-200/80"> · BEST {fmt(info.best)}</span> : null}
          </div>
        ) : (
          <button
            onClick={handleEnter}
            disabled={busy}
            className="clip-corners w-full border border-amber-400/60 bg-amber-500/15 py-2.5 text-[11px] tracking-[0.3em] text-amber-100 transition-all hover:bg-amber-500/30 disabled:opacity-50"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            {busy ? 'PROCESSING…' : `ENTER · ${fmt(TOURNAMENT_FEE)} $SPACEX`}
          </button>
        )}
        {msg && <div className="mt-2 text-center text-[10px] text-amber-200/80">{msg}</div>}
      </div>

      {/* Live board */}
      {info && info.board.length > 0 && (
        <div className="mt-4 border-t border-amber-400/15 pt-3">
          <div className="mb-1.5 text-[9px] tracking-[0.3em] text-slate-500">STANDINGS</div>
          <div className="flex flex-col gap-1">
            {info.board.slice(0, 5).map((e, i) => (
              <div key={e.wallet} className="flex justify-between text-[11px] tracking-wider">
                <span className={i === 0 ? 'text-amber-300' : 'text-slate-400'}>
                  {i + 1}. {e.name}
                  {i === 0 ? ' 👑' : ''}
                </span>
                <span className={i === 0 ? 'text-amber-200' : 'text-cyan-300/80'}>{fmt(e.score)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mt-3 text-center text-[8px] leading-relaxed tracking-wider text-slate-600">
        Entry fees fund the prize. Scores are server-verified. Winner paid after the timer ends.
      </div>
    </div>
  );
}

/** Drops into Game Over: if the player entered, submits their verified run. */
export function TournamentResult() {
  const { enabled, address, name } = useWallet();
  const [state, setState] = useState<'idle' | 'submitting' | 'done' | 'notEntered' | 'error'>('idle');
  const [rank, setRank] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    if (!enabled || !address || fired.current) return;
    fired.current = true;
    (async () => {
      const info = await fetchTournament(address);
      if (!info?.entered) {
        setState('notEntered');
        return;
      }
      setState('submitting');
      const run = useGame.getState().getRunBreakdown();
      const res = await submitTournamentScore(address, name, run);
      if (res.ok) {
        setRank(res.rank ?? null);
        setState('done');
      } else {
        setErr(res.error ?? 'submit failed');
        setState('error');
      }
    })();
  }, [enabled, address, name]);

  if (!enabled || state === 'idle' || state === 'notEntered') return null;

  return (
    <div className="clip-corners mt-6 border border-amber-400/30 bg-amber-950/15 px-6 py-3 text-center text-[11px] tracking-[0.25em]">
      {state === 'submitting' && <span className="text-amber-200/80">SUBMITTING TO TOURNAMENT…</span>}
      {state === 'done' && (
        <span className="text-amber-200">
          ◆ TOURNAMENT RUN LOGGED{rank ? ` — RANK #${rank}` : ''}
        </span>
      )}
      {state === 'error' && <span className="text-red-300/80">TOURNAMENT: {err}</span>}
    </div>
  );
}
