import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tokenomics — STARSHIP: BLACK HORIZON',
  description: 'Token details, 5/5 tax breakdown, and liquidity structure for the Starship: Black Horizon token.',
};

function Section({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-16">
      <div className="mb-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-cyan-400/20" />
        <h2
          className="text-xs tracking-[0.5em] text-cyan-400"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          {label}
        </h2>
        <div className="h-px flex-1 bg-cyan-400/20" />
      </div>
      {children}
    </section>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`border border-cyan-400/20 bg-slate-950/60 p-5 backdrop-blur-sm ${className}`}
      style={{ clipPath: 'polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)' }}
    >
      {children}
    </div>
  );
}

function GlowBar({ pct, color = '#22d3ee' }: { pct: number; color?: string }) {
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-none bg-slate-800">
      <div
        className="h-full transition-all duration-700"
        style={{
          width: `${pct}%`,
          background: color,
          boxShadow: `0 0 8px ${color}, 0 0 20px ${color}55`,
        }}
      />
    </div>
  );
}

export default function TokenomicsPage() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflowY: 'auto',
        background: '#02020a',
        fontFamily: "'Share Tech Mono', ui-monospace, monospace",
        color: '#e2e8f0',
      }}
    >
      {/* Grid background */}
      <div
        className="pointer-events-none fixed inset-0 opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(rgba(34,211,238,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(34,211,238,0.07) 1px,transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative mx-auto max-w-4xl px-5 py-12 md:px-10 md:py-16">

        {/* ── Header ── */}
        <header className="mb-16 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[10px] tracking-[0.6em] text-cyan-400/60">STARSHIP: BLACK HORIZON</p>
            <h1
              className="mt-2 text-3xl font-black tracking-[0.15em] text-cyan-100 md:text-4xl"
              style={{
                fontFamily: 'Orbitron, sans-serif',
                textShadow: '0 0 8px rgba(34,211,238,0.6),0 0 24px rgba(34,211,238,0.3)',
              }}
            >
              TOKENOMICS
            </h1>
            <p className="mt-1 text-[11px] tracking-[0.35em] text-cyan-400/70">TOKEN STRUCTURE & TAX BREAKDOWN</p>
          </div>
          <div className="flex flex-col gap-2 self-start">
            <Link
              href="/"
              className="text-center text-[10px] tracking-[0.4em] text-cyan-300/80 transition-colors hover:text-cyan-200"
              style={{ clipPath: 'polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)', border: '1px solid rgba(34,211,238,0.35)', padding: '8px 18px', background: 'rgba(34,211,238,0.05)' }}
            >
              ← LAUNCH GAME
            </Link>
            <Link
              href="/docs"
              className="text-center text-[10px] tracking-[0.4em] text-slate-500 transition-colors hover:text-slate-300"
              style={{ clipPath: 'polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)', border: '1px solid rgba(148,163,184,0.15)', padding: '8px 18px', background: 'rgba(148,163,184,0.03)' }}
            >
              FIELD MANUAL
            </Link>
          </div>
        </header>

        {/* ── Overview stats ── */}
        <Section id="overview" label="TOKEN OVERVIEW">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="text-center">
              <p className="text-[9px] tracking-[0.5em] text-cyan-400/60 mb-2">BUY TAX</p>
              <p
                className="text-4xl font-black text-cyan-300"
                style={{ fontFamily: 'Orbitron, sans-serif', textShadow: '0 0 12px rgba(34,211,238,0.8)' }}
              >
                5%
              </p>
            </Card>
            <Card className="text-center">
              <p className="text-[9px] tracking-[0.5em] text-cyan-400/60 mb-2">SELL TAX</p>
              <p
                className="text-4xl font-black text-cyan-300"
                style={{ fontFamily: 'Orbitron, sans-serif', textShadow: '0 0 12px rgba(34,211,238,0.8)' }}
              >
                5%
              </p>
            </Card>
            <Card className="text-center">
              <p className="text-[9px] tracking-[0.5em] text-cyan-400/60 mb-2">LIQUIDITY</p>
              <p
                className="text-4xl font-black text-emerald-400"
                style={{ fontFamily: 'Orbitron, sans-serif', textShadow: '0 0 12px rgba(52,211,153,0.8)' }}
              >
                100%
              </p>
            </Card>
          </div>
          <Card className="mt-4">
            <p className="text-sm leading-relaxed text-slate-300">
              Every transaction carries a <strong className="text-cyan-300">5% buy</strong> and{' '}
              <strong className="text-cyan-300">5% sell</strong> tax.{' '}
              <strong className="text-emerald-300">100% of all collected fees flow directly into the liquidity pool</strong> — no dev wallet, no team allocation, no hidden cuts. The pool is the engine that powers deployment infrastructure, marketing, and long-term ecosystem health.
            </p>
          </Card>
        </Section>

        {/* ── Tax breakdown ── */}
        <Section id="tax" label="5 / 5 TAX BREAKDOWN">
          <div className="grid gap-4 md:grid-cols-2">

            <Card>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: '#22d3ee', boxShadow: '0 0 8px #22d3ee' }} />
                  <span className="text-sm tracking-[0.2em] text-slate-100" style={{ fontFamily: 'Orbitron, sans-serif' }}>BUY TAX</span>
                </div>
                <span className="text-[9px] tracking-[0.3em] text-slate-500">5% PER TRANSACTION</span>
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <div className="mb-1 flex justify-between text-[10px] text-slate-400">
                    <span>Liquidity Pool</span>
                    <span className="text-cyan-300">100%</span>
                  </div>
                  <GlowBar pct={100} color="#22d3ee" />
                </div>
              </div>
              <p className="mt-4 text-[10px] leading-relaxed text-slate-500">
                Every buy contributes the full 5% directly to locked liquidity. Deeper liquidity means lower slippage and a healthier market for all holders.
              </p>
            </Card>

            <Card>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: '#f472b6', boxShadow: '0 0 8px #f472b6' }} />
                  <span className="text-sm tracking-[0.2em] text-slate-100" style={{ fontFamily: 'Orbitron, sans-serif' }}>SELL TAX</span>
                </div>
                <span className="text-[9px] tracking-[0.3em] text-slate-500">5% PER TRANSACTION</span>
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <div className="mb-1 flex justify-between text-[10px] text-slate-400">
                    <span>Liquidity Pool</span>
                    <span className="text-cyan-300">100%</span>
                  </div>
                  <GlowBar pct={100} color="#f472b6" />
                </div>
              </div>
              <p className="mt-4 text-[10px] leading-relaxed text-slate-500">
                Sell pressure is absorbed and recycled back into the pool — turning sell volume into liquidity depth rather than letting it drain the project.
              </p>
            </Card>

          </div>
        </Section>

        {/* ── What the pool funds ── */}
        <Section id="allocation" label="WHAT THE POOL FUNDS">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon: '⬡',
                color: '#22d3ee',
                title: 'LIQUIDITY DEPTH',
                desc: 'The primary use. A growing pool means tighter spreads, less slippage, and a more stable price floor. The deeper the pool, the harder it is to move the price with single transactions.',
              },
              {
                icon: '◈',
                color: '#fbbf24',
                title: 'DEPLOYMENT & INFRASTRUCTURE',
                desc: 'Smart contract deployment, audits, RPC node costs, API upkeep, and on-chain operational overhead. These are fixed costs required to keep the token running reliably.',
              },
              {
                icon: '◆',
                color: '#a78bfa',
                title: 'MARKETING & GROWTH',
                desc: 'Paid promotions, community campaigns, influencer partnerships, and advertising to drive awareness and bring new players and holders into the ecosystem.',
              },
            ].map((item) => (
              <Card key={item.title}>
                <div className="mb-3 flex items-center gap-2">
                  <span style={{ color: item.color, fontSize: '1rem', textShadow: `0 0 8px ${item.color}` }}>{item.icon}</span>
                  <span className="text-[10px] tracking-[0.3em]" style={{ color: item.color, fontFamily: 'Orbitron, sans-serif' }}>{item.title}</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400">{item.desc}</p>
              </Card>
            ))}
          </div>
        </Section>

        {/* ── Why no dev wallet ── */}
        <Section id="why" label="WHY 100% TO LIQUIDITY">
          <Card>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="mb-3 text-[10px] tracking-[0.4em] text-emerald-400">THE PRINCIPLE</p>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  Most tokens split fees — some to dev, some to marketing, some to liquidity. The problem is that
                  split allocations create misaligned incentives and reduce the capital that actually
                  supports the token price.
                </p>
                <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
                  With 100% going to the pool, every single transaction — buy or sell — makes the market healthier.
                  Operational costs are covered as the ecosystem grows, not extracted from early holders.
                </p>
              </div>
              <div>
                <p className="mb-3 text-[10px] tracking-[0.4em] text-cyan-400">WHAT THIS MEANS FOR YOU</p>
                <div className="flex flex-col gap-3">
                  {[
                    ['No dev drain', 'Zero extraction to team wallets on every trade'],
                    ['Self-sustaining', 'Volume funds the operations automatically'],
                    ['Price support', 'Liquidity deepens as the community grows'],
                    ['Transparent', 'All fees are on-chain and verifiable'],
                  ].map(([title, desc]) => (
                    <div key={title as string} className="flex items-start gap-3">
                      <span className="mt-0.5 text-cyan-400">›</span>
                      <div>
                        <span className="text-[10px] tracking-[0.2em] text-slate-200">{title}</span>
                        <span className="ml-2 text-[10px] text-slate-500">{desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </Section>

        {/* ── Footer ── */}
        <footer className="mt-8 flex flex-col items-center gap-4 border-t border-cyan-400/10 pt-8 text-center">
          <Link
            href="/"
            className="text-[10px] tracking-[0.5em] text-cyan-300 transition-colors hover:text-cyan-100"
            style={{ clipPath: 'polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)', border: '1px solid rgba(34,211,238,0.4)', padding: '10px 28px', background: 'rgba(34,211,238,0.08)' }}
          >
            LAUNCH GAME
          </Link>
          <div className="flex items-center gap-5 text-[10px] tracking-[0.35em] text-slate-600">
            <a href="https://t.me/+6m_1n4OJlXtmMDNk" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition-colors">TELEGRAM</a>
            <span>·</span>
            <a href="https://x.com/SpaceXgamess" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition-colors">FOLLOW ON X</a>
          </div>
          <p className="text-[9px] tracking-[0.3em] text-slate-700">STARSHIP: BLACK HORIZON · TOKENOMICS v1.0</p>
        </footer>

      </div>
    </div>
  );
}
