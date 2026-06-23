'use client';

import { useEffect, useRef, useState } from 'react';
import { useWallet } from '@/lib/wallet';
import { fetchLeaderboard, submitScore, LeaderEntry } from '@/lib/leaderboard';
import WalletPanel from '@/components/WalletPanel';

// Connect chip → opens the wallet panel when connected.
// Renders nothing when wallet login isn't configured.
export function WalletBadge() {
  const { enabled, ready, connected, address, login } = useWallet();
  const [open, setOpen] = useState(false);
  if (!enabled) return null;

  if (!connected) {
    return (
      <button
        onClick={login}
        disabled={!ready}
        className="clip-corners flex items-center gap-2 border border-fuchsia-400/50 bg-fuchsia-500/10 px-4 py-2 text-[10px] tracking-[0.3em] text-fuchsia-200 transition-all hover:border-fuchsia-300 hover:bg-fuchsia-500/20 disabled:opacity-40"
        style={{ fontFamily: 'Orbitron, sans-serif' }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400 shadow-[0_0_6px_#e879f9]" />
        CONNECT WALLET
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Open wallet"
        className="clip-corners flex items-center gap-2 border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-[10px] tracking-[0.3em] text-cyan-200 transition-all hover:border-cyan-300 hover:bg-cyan-400/20"
        style={{ fontFamily: 'Orbitron, sans-serif' }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
        {address ? `${address.slice(0, 4)}…${address.slice(-4)}` : 'CONNECTED'}
      </button>
      {open && <WalletPanel onClose={() => setOpen(false)} />}
    </>
  );
}

const RANK_COLOR = ['#fde047', '#cbd5e1', '#f59e0b']; // gold, silver, bronze

// Top-10 board. Pass `submitScoreValue` (from a finished run) to push the
// score before displaying — it submits once per mount when a wallet is connected.
export function Leaderboard({ submitScoreValue }: { submitScoreValue?: number }) {
  const { connected, address, name } = useWallet();
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const submitted = useRef(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      if (submitScoreValue != null && connected && address && !submitted.current) {
        submitted.current = true;
        const res = await submitScore({ wallet: address, name, score: submitScoreValue });
        if (active && res) {
          setEntries(res.entries);
          setMyRank(res.rank);
          setLoading(false);
          return;
        }
      }
      const list = await fetchLeaderboard();
      if (active) {
        setEntries(list);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [submitScoreValue, connected, address, name]);

  return (
    <div className="clip-corners w-72 border border-cyan-400/30 bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between">
        <span
          className="text-glow-cyan text-xs tracking-[0.4em] text-cyan-300"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          ◆ TOP PILOTS
        </span>
        <span className="text-[9px] tracking-[0.2em] text-slate-500">GLOBAL</span>
      </div>

      {loading ? (
        <div className="py-6 text-center text-[10px] tracking-[0.3em] text-cyan-400/60 animate-pulseGlow">
          SYNCING…
        </div>
      ) : entries.length === 0 ? (
        <div className="py-6 text-center text-[10px] leading-relaxed tracking-[0.2em] text-slate-500">
          NO SCORES YET
          <br />
          BE THE FIRST
        </div>
      ) : (
        <ol className="space-y-1">
          {entries.map((e, i) => {
            const me = !!address && e.wallet === address;
            return (
              <li
                key={e.wallet}
                className={`flex items-center gap-2 px-2 py-1 text-[11px] tracking-wider ${
                  me ? 'clip-corners bg-cyan-400/10 text-cyan-100' : 'text-slate-300'
                }`}
              >
                <span
                  className="w-5 text-right font-bold"
                  style={{ color: RANK_COLOR[i] ?? '#64748b', fontFamily: 'Orbitron, sans-serif' }}
                >
                  {i + 1}
                </span>
                <span className="flex-1 truncate" title={e.wallet}>
                  {e.name}
                  {me && <span className="ml-1 text-[8px] text-cyan-400/70">(YOU)</span>}
                </span>
                <span className="text-amber-300/90 tabular-nums">
                  {String(e.score).padStart(6, '0')}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {submitScoreValue != null && connected && myRank != null && (
        <div className="mt-3 border-t border-cyan-400/20 pt-2 text-center text-[10px] tracking-[0.3em] text-cyan-300">
          YOUR RANK&nbsp;&nbsp;<span className="text-amber-200">#{myRank}</span>
        </div>
      )}
      {submitScoreValue != null && !connected && (
        <div className="mt-3 border-t border-cyan-400/20 pt-2 text-center text-[9px] leading-relaxed tracking-[0.2em] text-fuchsia-300/80">
          CONNECT WALLET TO
          <br />
          POST YOUR SCORE
        </div>
      )}
    </div>
  );
}
