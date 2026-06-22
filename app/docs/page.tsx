import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Field Manual — STARSHIP: BLACK HORIZON',
  description: 'Controls, weapons, enemies, and objectives for Starship: Black Horizon.',
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

function Pip({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
      <span>{label}</span>
    </span>
  );
}

function StatBar({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className="h-1.5 w-4"
          style={{
            background: i < value ? '#22d3ee' : 'rgba(34,211,238,0.12)',
            boxShadow: i < value ? '0 0 4px #22d3ee' : 'none',
          }}
        />
      ))}
    </div>
  );
}

export default function DocsPage() {
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
      {/* Subtle grid */}
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
            <p className="text-[10px] tracking-[0.6em] text-cyan-400/60">PHOBOS DEEP-SURVEY INITIATIVE</p>
            <h1
              className="mt-2 text-3xl font-black tracking-[0.15em] text-cyan-100 md:text-4xl"
              style={{
                fontFamily: 'Orbitron, sans-serif',
                textShadow: '0 0 8px rgba(34,211,238,0.6),0 0 24px rgba(34,211,238,0.3)',
              }}
            >
              FIELD MANUAL
            </h1>
            <p className="mt-1 text-[11px] tracking-[0.35em] text-cyan-400/70">STARSHIP: BLACK HORIZON</p>
          </div>
          <Link
            href="/"
            className="self-start text-[10px] tracking-[0.4em] text-cyan-300/80 transition-colors hover:text-cyan-200"
            style={{ clipPath: 'polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)', border: '1px solid rgba(34,211,238,0.35)', padding: '8px 18px', background: 'rgba(34,211,238,0.05)' }}
          >
            ← LAUNCH GAME
          </Link>
        </header>

        {/* ── Briefing ── */}
        <Section id="briefing" label="MISSION BRIEFING">
          <Card>
            <p className="text-sm leading-relaxed text-slate-300">
              Contact has been lost with Phobos Outpost VII. You are piloting a lone starship through
              the pitch-black canyons of Mars' moon. Your headlight is the only illumination for a
              thousand kilometres. Alien signatures are multiplying. Pick your hull, arm your cannon,
              clear the objectives, and survive long enough to meet a Behemoth in the dark.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-cyan-400/10 pt-4 text-[11px] text-slate-400 md:grid-cols-4">
              <div><span className="block text-[9px] tracking-[0.4em] text-cyan-400/70 mb-1">SETTING</span>Phobos, Mars orbit</div>
              <div><span className="block text-[9px] tracking-[0.4em] text-cyan-400/70 mb-1">GENRE</span>Twin-stick shooter</div>
              <div><span className="block text-[9px] tracking-[0.4em] text-cyan-400/70 mb-1">PLATFORM</span>Web · Mobile</div>
              <div><span className="block text-[9px] tracking-[0.4em] text-cyan-400/70 mb-1">OBJECTIVES</span>6 sequential</div>
            </div>
          </Card>
        </Section>

        {/* ── Controls ── */}
        <Section id="controls" label="CONTROLS">
          <div className="grid gap-5 md:grid-cols-2">
            <Card>
              <p className="mb-4 text-[9px] tracking-[0.4em] text-cyan-400/70">DESKTOP</p>
              <table className="w-full text-[11px]">
                <tbody className="divide-y divide-cyan-400/10">
                  {[
                    ['W A S D', 'Thrusters — move in any direction'],
                    ['MOUSE', 'Aim ship nose'],
                    ['LEFT CLICK / HOLD', 'Fire weapon'],
                    ['1 – 4', 'Switch weapon slot'],
                    ['SHIFT', 'Afterburner (burns fuel faster)'],
                  ].map(([key, desc]) => (
                    <tr key={key}>
                      <td className="py-2 pr-4 text-right text-cyan-300 whitespace-nowrap">{key}</td>
                      <td className="py-2 text-slate-400">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <Card>
              <p className="mb-4 text-[9px] tracking-[0.4em] text-cyan-400/70">MOBILE / TOUCHSCREEN</p>
              <table className="w-full text-[11px]">
                <tbody className="divide-y divide-cyan-400/10">
                  {[
                    ['LEFT STICK', 'Move / Steer'],
                    ['RIGHT STICK', 'Aim + fire (drag to aim, release to stop)'],
                    ['BOOST button', 'Afterburner'],
                    ['Weapon row', 'Tap to switch weapon'],
                  ].map(([key, desc]) => (
                    <tr key={key}>
                      <td className="py-2 pr-4 text-right text-cyan-300 whitespace-nowrap">{key}</td>
                      <td className="py-2 text-slate-400">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-4 text-[10px] text-slate-500">
                On mobile, if only the left stick is active (no right stick), the ship auto-aims in your movement direction.
              </p>
            </Card>
          </div>
        </Section>

        {/* ── Arsenal ── */}
        <Section id="weapons" label="ARSENAL">
          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                id: 1, name: 'PLASMA', tag: 'BALANCED', color: '#4ade80',
                desc: 'Single high-velocity bolt. Reliable all-rounder — good damage, fast fire rate, no spread. Best all-round pick when you are unsure what you face.',
                speed: 4, fireRate: 3, damage: 2, spread: 1, pierce: 1,
              },
              {
                id: 2, name: 'TWIN ION', tag: 'RAPID FIRE', color: '#22d3ee',
                desc: 'Fires two parallel bolts per shot at extreme speed. Shreds Drones and Stalkers. The narrow spread means you still need to aim.',
                speed: 5, fireRate: 5, damage: 2, spread: 1, pierce: 1,
              },
              {
                id: 3, name: 'SCATTER', tag: 'CLOSE RANGE', color: '#fbbf24',
                desc: 'Five-bolt shotgun fan. Devastating at close range, nearly useless at distance. Best against charging Stalkers or a Behemoth closing on you.',
                speed: 2, fireRate: 2, damage: 2, spread: 5, pierce: 1,
              },
              {
                id: 4, name: 'RAILGUN', tag: 'PIERCING', color: '#f472b6',
                desc: 'Slow-firing, high-damage slug that punches through up to 4 enemies in a line. Single shot melts Stalkers. Required for efficient Behemoth kills.',
                speed: 5, fireRate: 1, damage: 5, spread: 1, pierce: 4,
              },
            ].map((w) => (
              <Card key={w.id}>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: w.color, boxShadow: `0 0 8px ${w.color}` }} />
                    <span className="text-sm tracking-[0.2em] text-slate-100" style={{ fontFamily: 'Orbitron, sans-serif' }}>{w.name}</span>
                  </div>
                  <span className="text-[9px] tracking-[0.3em] text-slate-500">{w.tag} · SLOT {w.id}</span>
                </div>
                <p className="mb-4 text-[11px] leading-relaxed text-slate-400">{w.desc}</p>
                <div className="grid grid-cols-2 gap-y-2 text-[10px] text-slate-500">
                  {[
                    ['SPEED', w.speed],
                    ['FIRE RATE', w.fireRate],
                    ['DAMAGE', w.damage],
                    ['SPREAD', w.spread],
                    ['PIERCE', w.pierce],
                  ].map(([label, val]) => (
                    <div key={label as string} className="flex flex-col gap-1">
                      <span className="tracking-widest">{label}</span>
                      <StatBar value={val as number} />
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </Section>

        {/* ── Contacts ── */}
        <Section id="enemies" label="HOSTILE CONTACTS">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: '#c084fc', boxShadow: '0 0 8px #c084fc' }} />
                <span className="text-sm tracking-[0.2em]" style={{ fontFamily: 'Orbitron, sans-serif' }}>STALKER</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                Purple spheroid with 5 tentacles. 2 HP. Weaves side-to-side as it closes in. Spawns most frequently.
                Crashes for <strong className="text-slate-300">20 shield damage</strong>.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-1 text-[10px] text-slate-500">
                <span>HP</span><StatBar value={1} />
                <span>SPEED</span><StatBar value={3} />
                <span>DROPS</span><span className="text-cyan-300">3 fragments</span>
                <span>SCORE</span><span className="text-cyan-300">100 pts</span>
              </div>
            </Card>

            <Card>
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: '#4ade80', boxShadow: '0 0 8px #4ade80' }} />
                <span className="text-sm tracking-[0.2em]" style={{ fontFamily: 'Orbitron, sans-serif' }}>DRONE</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                Green sphere ringed by a spinning energy torus. 1 HP — one hit kill. Fastest unit in the field.
                Crashes for <strong className="text-slate-300">14 shield damage</strong>.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-1 text-[10px] text-slate-500">
                <span>HP</span><StatBar value={1} max={5} />
                <span>SPEED</span><StatBar value={5} />
                <span>DROPS</span><span className="text-cyan-300">2 fragments</span>
                <span>SCORE</span><span className="text-cyan-300">100 pts</span>
              </div>
            </Card>

            <Card>
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: '#f43f5e', boxShadow: '0 0 8px #f43f5e' }} />
                <span className="text-sm tracking-[0.2em]" style={{ fontFamily: 'Orbitron, sans-serif' }}>BEHEMOTH</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                Massive red boss with 8 tentacles and a crown of spikes. 45 HP. Shows a floating health bar.
                Crashes for <strong className="text-slate-300">38 shield damage</strong>. Spawns every 3rd wave.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-1 text-[10px] text-slate-500">
                <span>HP</span><StatBar value={5} />
                <span>SPEED</span><StatBar value={2} />
                <span>DROPS</span><span className="text-cyan-300">9 fragments</span>
                <span>SCORE</span><span className="text-cyan-300">750 pts</span>
              </div>
            </Card>
          </div>

          <div className="mt-4">
            <Card>
              <div className="mb-3 flex items-center gap-3">
                <span className="inline-block h-2.5 w-2.5 rounded" style={{ background: '#94a3b8', boxShadow: '0 0 6px #94a3b8' }} />
                <span className="text-sm tracking-[0.2em]" style={{ fontFamily: 'Orbitron, sans-serif' }}>ASTEROIDS &amp; METEOROIDS</span>
                <span className="text-[9px] tracking-[0.3em] text-slate-500">ENVIRONMENTAL HAZARD</span>
              </div>
              <div className="grid gap-4 text-[11px] text-slate-400 md:grid-cols-2">
                <div>
                  <p className="mb-2"><strong className="text-slate-200">Asteroid (grey)</strong> — 3 HP. Small, fast-drifting rock.
                  Deals <strong className="text-slate-300">16 shield damage</strong> on collision. Drops 2 fragments when destroyed by weapon fire.</p>
                  <p><strong className="text-slate-200">Meteoroid (amber glow)</strong> — 8 HP. Larger, tankier, smoulders with inner heat.
                  Deals <strong className="text-slate-300">28 shield damage</strong> on collision. Drops 4 fragments.</p>
                </div>
                <div>
                  <p className="mb-1 text-[10px] tracking-widest text-slate-500">RADAR SIGNATURE</p>
                  <div className="flex gap-4">
                    <Pip color="#94a3b8" label="Asteroid" />
                    <Pip color="#f59e0b" label="Meteoroid" />
                  </div>
                  <p className="mt-3 text-slate-500">
                    Rocks drift across the map at varying angles. Both types appear on radar as rotating diamonds.
                    Use the Railgun to clear clusters efficiently.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </Section>

        {/* ── Life support ── */}
        <Section id="resources" label="LIFE SUPPORT">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                label: 'SHIELDS', color: '#22d3ee', unit: '%',
                desc: 'Absorbs all damage. Crashes with aliens deal 14–38 points; asteroid impacts deal 16–28. Shields do not regenerate naturally — collect star fragments to survive.',
              },
              {
                label: 'FUEL', color: '#fbbf24', unit: '%',
                desc: 'Drains slowly at idle (0.12%/s). Drain accelerates with thrusters active (1.6%/s) and heavily with Afterburner (3.4%/s). Refuelled by 4% per fragment collected.',
              },
              {
                label: 'OXYGEN', color: '#34d399', unit: '%',
                desc: 'Drains constantly at 0.55%/s regardless of activity. Reaches zero → instant mission failure. Replenished by 5% per fragment collected. Prioritise fragment runs.',
              },
            ].map((r) => (
              <Card key={r.label}>
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-sm" style={{ background: r.color, boxShadow: `0 0 6px ${r.color}` }} />
                  <span className="text-[10px] tracking-[0.4em]" style={{ color: r.color }}>{r.label}</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400">{r.desc}</p>
              </Card>
            ))}
          </div>
          <Card className="mt-4">
            <p className="text-[10px] tracking-[0.35em] text-amber-400 mb-3">◆ STAR FRAGMENTS</p>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Cyan octahedra dropped by destroyed hostiles and asteroids. Float at low altitude. Fly within{' '}
              <strong className="text-slate-200">7 units</strong> to activate the tractor pull — the fragment will home in on your ship.
              Move within <strong className="text-slate-200">2.6 units</strong> to collect. Each fragment restores{' '}
              <strong className="text-slate-200">+4% fuel</strong>, <strong className="text-slate-200">+5% oxygen</strong>, and adds{' '}
              <strong className="text-slate-200">+25 score</strong>. Fragments also appear on the proximity radar as cyan squares.
            </p>
          </Card>
        </Section>

        {/* ── Objectives ── */}
        <Section id="objectives" label="OBJECTIVES">
          <div className="grid gap-3">
            {[
              { id: 1, title: 'FIRST CONTACT', desc: 'Destroy 5 hostiles', reward: 500, type: 'kills' },
              { id: 2, title: 'SALVAGE RUN', desc: 'Harvest 10 star fragments', reward: 600, type: 'fragments' },
              { id: 3, title: 'HOLD THE LINE', desc: 'Survive to wave 3', reward: 800, type: 'wave' },
              { id: 4, title: 'LEVIATHAN', desc: 'Bring down a Behemoth', reward: 1500, type: 'boss' },
              { id: 5, title: 'DEEP SURVEY', desc: 'Destroy 25 hostiles', reward: 1200, type: 'kills' },
              { id: 6, title: 'EXTINCTION', desc: 'Slay 3 Behemoths', reward: 3000, type: 'boss' },
            ].map((m) => (
              <Card key={m.id} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span
                    className="hidden w-6 text-center text-[9px] tracking-widest text-cyan-400/50 md:block"
                    style={{ fontFamily: 'Orbitron, sans-serif' }}
                  >
                    {String(m.id).padStart(2, '0')}
                  </span>
                  <div>
                    <div className="text-[11px] tracking-[0.25em] text-slate-100" style={{ fontFamily: 'Orbitron, sans-serif' }}>{m.title}</div>
                    <div className="mt-0.5 text-[10px] tracking-widest text-slate-500">{m.desc}</div>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[11px] tracking-widest text-amber-300">+{m.reward.toLocaleString()}</div>
                  <div className="text-[9px] tracking-[0.3em] text-slate-600">BONUS PTS</div>
                </div>
              </Card>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-slate-500">
            Objectives complete in sequence. After all 6 are cleared the game enters <strong className="text-slate-300">FREE HUNT</strong> — rack up the highest score you can.
            Progress resets on each new mission.
          </p>
        </Section>

        {/* ── Radar ── */}
        <Section id="radar" label="PROXIMITY RADAR">
          <Card>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="mb-4 text-[11px] leading-relaxed text-slate-400">
                  The circular radar in the bottom-right corner (desktop) shows all contacts within{' '}
                  <strong className="text-slate-200">70 units</strong> of your ship. The display rotates with your heading —
                  the triangle at centre is always your nose direction.
                </p>
                <div className="flex flex-col gap-2 text-[11px]">
                  <Pip color="#c084fc" label="Stalker" />
                  <Pip color="#4ade80" label="Drone" />
                  <Pip color="#f43f5e" label="Behemoth (large pulsing dot)" />
                  <Pip color="#22d3ee" label="Star fragment" />
                  <Pip color="#94a3b8" label="Asteroid" />
                  <Pip color="#f59e0b" label="Meteoroid (large diamond)" />
                </div>
              </div>
              <div className="text-[11px] leading-relaxed text-slate-400">
                <p className="mb-3">
                  Three range rings divide the radar into thirds. Contacts beyond 70 units are not shown.
                </p>
                <p>
                  A rotating sweep arm illuminates the display. Alien contacts pulse to stand out from background noise.
                  Use the radar during low-visibility situations — your headlight only covers a narrow forward cone.
                </p>
              </div>
            </div>
          </Card>
        </Section>

        {/* ── Hull skins ── */}
        <Section id="skins" label="HULL VARIANTS">
          <div className="grid gap-3 md:grid-cols-5">
            {[
              { name: 'FROST', tag: 'Standard Issue', hull: '#cbd5e1', accent: '#38bdf8' },
              { name: 'INFERNO', tag: 'Volcanic Plating', hull: '#7f1d1d', accent: '#fb923c' },
              { name: 'VOID', tag: 'Stealth Coating', hull: '#1e1b2e', accent: '#a855f7' },
              { name: 'TOXIC', tag: 'Bio-Hazard Hull', hull: '#3f6212', accent: '#a3e635' },
              { name: 'SOLAR', tag: 'Gilded Chassis', hull: '#d4a017', accent: '#fde047' },
            ].map((s) => (
              <Card key={s.name} className="text-center">
                <div
                  className="mx-auto mb-3 h-12 w-12 rounded-sm border border-slate-700"
                  style={{ background: `linear-gradient(135deg, ${s.hull} 55%, ${s.accent} 55%)` }}
                />
                <div className="text-[10px] tracking-[0.25em] text-slate-200">{s.name}</div>
                <div className="mt-0.5 text-[9px] tracking-widest text-slate-600">{s.tag}</div>
              </Card>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-slate-500">
            Hull skins are cosmetic only — no gameplay difference. Select before launching a mission from the main menu.
          </p>
        </Section>

        {/* ── Scoring ── */}
        <Section id="scoring" label="SCORING">
          <Card>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-left text-[9px] tracking-[0.4em] text-cyan-400/70">
                  <th className="pb-3 pr-8">ACTION</th>
                  <th className="pb-3">SCORE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-400/10 text-slate-400">
                {[
                  ['Kill Stalker (weapon)', '100 pts'],
                  ['Kill Drone (weapon)', '100 pts'],
                  ['Kill Behemoth (weapon)', '750 pts'],
                  ['Destroy Asteroid', '40 pts'],
                  ['Destroy Meteoroid', '120 pts'],
                  ['Collect star fragment', '25 pts'],
                  ['Objective 1 — FIRST CONTACT', '+500 pts bonus'],
                  ['Objective 2 — SALVAGE RUN', '+600 pts bonus'],
                  ['Objective 3 — HOLD THE LINE', '+800 pts bonus'],
                  ['Objective 4 — LEVIATHAN', '+1,500 pts bonus'],
                  ['Objective 5 — DEEP SURVEY', '+1,200 pts bonus'],
                  ['Objective 6 — EXTINCTION', '+3,000 pts bonus'],
                ].map(([action, score]) => (
                  <tr key={action}>
                    <td className="py-2 pr-8">{action}</td>
                    <td className="py-2 text-amber-300">{score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-[10px] text-slate-600">
              Crash kills (alien or asteroid collides into you) do not award score or count toward kill objectives, but fragments still drop.
            </p>
          </Card>
        </Section>

        {/* ── Tips ── */}
        <Section id="tips" label="PILOT NOTES">
          <div className="grid gap-3 md:grid-cols-2">
            {[
              { title: 'Oxygen is the clock', body: 'O₂ drains at 0.55%/s no matter what — that is about 3 minutes of life on a full tank. Prioritise fragment collection over kills. A dead pilot scores nothing.' },
              { title: 'Boost sparingly', body: 'Afterburner drains fuel at 3.4%/s — more than twice the normal thruster rate. Use it to close on a fragment cluster or escape a Behemoth, not to cruise.' },
              { title: 'Railgun for Behemoths', body: '45 HP is a lot to whittle with Plasma. Switch to Railgun before a boss wave — 4 pierce shots hit for 4 damage each, cutting your kill time in half.' },
              { title: 'Strafe, do not stop', body: 'Aliens always home in on your current position. Constant lateral movement makes you much harder to hit when they close in.' },
              { title: 'Sweep for fragments', body: 'After a kill, slow down and arc through the debris field. The 7-unit magnet range means you do not need to touch each fragment — just orbit the kill zone.' },
              { title: 'Watch the radar', body: 'Your headlight only lights a narrow cone ahead. A Behemoth can approach silently from behind. The radar gives 360° awareness at all times.' },
            ].map((tip) => (
              <Card key={tip.title}>
                <p className="mb-1 text-[10px] tracking-[0.3em] text-amber-400">◆ {tip.title.toUpperCase()}</p>
                <p className="text-[11px] leading-relaxed text-slate-400">{tip.body}</p>
              </Card>
            ))}
          </div>
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
          <p className="text-[9px] tracking-[0.3em] text-slate-700">PHOBOS DEEP-SURVEY INITIATIVE · FIELD MANUAL v1.0</p>
        </footer>

      </div>
    </div>
  );
}
