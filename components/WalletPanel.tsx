'use client';

import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useWallet, Asset } from '@/lib/wallet';
import { getBalances, Balances } from '@/lib/balances';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[11px] tracking-wider">
      <span className="text-slate-400">{label}</span>
      <span className="text-cyan-200 tabular-nums">{value}</span>
    </div>
  );
}

export default function WalletPanel({ onClose }: { onClose: () => void }) {
  const { address, name, premium, logout, sendAsset } = useWallet();
  const [tab, setTab] = useState<'overview' | 'receive' | 'send'>('overview');
  const [balances, setBalances] = useState<Balances | null>(null);
  const [loadingBal, setLoadingBal] = useState(true);
  const [qr, setQr] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Send form
  const [asset, setAsset] = useState<Asset>('SPACEX');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!address) return;
    setLoadingBal(true);
    getBalances(address)
      .then(setBalances)
      .finally(() => setLoadingBal(false));
  }, [address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (address) QRCode.toDataURL(address, { margin: 1, width: 200 }).then(setQr).catch(() => {});
  }, [address]);

  const copy = () => {
    if (!address) return;
    navigator.clipboard?.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSend = async () => {
    setSending(true);
    setSendMsg('Confirm in your wallet…');
    const res = await sendAsset({ to: to.trim(), amount: Number(amount), asset });
    setSending(false);
    if (res.ok) {
      setSendMsg(`✓ Sent! ${res.signature?.slice(0, 8)}…`);
      setTo('');
      setAmount('');
      setTimeout(refresh, 1500);
    } else {
      setSendMsg(res.error || 'Send failed');
    }
  };

  if (!address) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="clip-corners w-full max-w-sm border border-cyan-400/40 bg-slate-950/95 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <span
            className="text-glow-cyan text-sm tracking-[0.3em] text-cyan-300"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            ◆ WALLET
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close">
            ✕
          </button>
        </div>

        {/* Address */}
        <button
          onClick={copy}
          title="Copy address"
          className="clip-corners mb-3 flex w-full items-center justify-between border border-cyan-400/20 bg-cyan-950/30 px-3 py-2 text-left transition-all hover:border-cyan-400/50"
        >
          <span className="truncate text-[11px] text-cyan-200">{address}</span>
          <span className="ml-2 shrink-0 text-[9px] tracking-widest text-cyan-400/70">
            {copied ? 'COPIED' : 'COPY'}
          </span>
        </button>

        {/* Tabs */}
        <div className="mb-4 flex gap-1">
          {(['overview', 'receive', 'send'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`clip-corners flex-1 px-2 py-1.5 text-[10px] tracking-[0.2em] transition-all ${
                tab === t
                  ? 'border border-cyan-400/50 bg-cyan-400/15 text-cyan-200'
                  : 'border border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'overview' && (
          <div className="space-y-2">
            <div className="clip-corners border border-slate-700/50 bg-slate-900/40 px-3 py-3 space-y-2">
              <Row
                label="$SPACEX"
                value={loadingBal ? '…' : (balances?.spacex ?? 0).toLocaleString()}
              />
              <Row label="SOL" value={loadingBal ? '…' : (balances?.sol ?? 0).toFixed(4)} />
            </div>
            <Row label="PREMIUM" value={premium ? '★ UNLOCKED' : 'LOCKED'} />
            <div className="flex gap-2 pt-2">
              <button
                onClick={refresh}
                className="clip-corners flex-1 border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-[10px] tracking-[0.2em] text-cyan-300 hover:bg-cyan-400/20"
              >
                REFRESH
              </button>
              <button
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="clip-corners flex-1 border border-red-400/40 bg-red-500/10 px-3 py-2 text-[10px] tracking-[0.2em] text-red-300 hover:bg-red-500/20"
              >
                DISCONNECT
              </button>
            </div>
          </div>
        )}

        {/* Receive */}
        {tab === 'receive' && (
          <div className="flex flex-col items-center gap-3">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="wallet address QR" className="rounded-md" width={180} height={180} />
            ) : (
              <div className="h-[180px] w-[180px] animate-pulse rounded-md bg-slate-800" />
            )}
            <p className="text-center text-[10px] leading-relaxed text-slate-400">
              Scan or copy your address above to receive
              <br />
              SOL or $SPACEX into this wallet.
            </p>
          </div>
        )}

        {/* Send */}
        {tab === 'send' && (
          <div className="space-y-3">
            <div className="flex gap-1">
              {(['SPACEX', 'SOL'] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => setAsset(a)}
                  className={`clip-corners flex-1 px-2 py-1.5 text-[10px] tracking-[0.2em] transition-all ${
                    asset === a
                      ? 'border border-amber-400/50 bg-amber-400/15 text-amber-200'
                      : 'border border-slate-700 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {a === 'SPACEX' ? '$SPACEX' : 'SOL'}
                </button>
              ))}
            </div>
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="Recipient address"
              className="clip-corners w-full border border-slate-700 bg-slate-900/60 px-3 py-2 text-[11px] text-cyan-100 placeholder:text-slate-600 focus:border-cyan-400/50 focus:outline-none"
            />
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Amount (${asset === 'SPACEX' ? '$SPACEX' : 'SOL'})`}
              inputMode="decimal"
              className="clip-corners w-full border border-slate-700 bg-slate-900/60 px-3 py-2 text-[11px] text-cyan-100 placeholder:text-slate-600 focus:border-cyan-400/50 focus:outline-none"
            />
            <button
              onClick={handleSend}
              disabled={sending}
              className="clip-corners w-full border border-amber-400/60 bg-amber-500/15 px-3 py-2.5 text-[11px] tracking-[0.3em] text-amber-100 transition-all hover:bg-amber-500/30 disabled:opacity-50"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              {sending ? 'SENDING…' : 'SEND'}
            </button>
            {sendMsg && (
              <div className="break-words text-center text-[10px] text-cyan-200/80">{sendMsg}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
