// Player-selectable cosmetics + gear, plus the mission ladder.
// Pure data — read by the menu UI (reactive) and the flight loop (per-frame).

export interface Skin {
  id: number;
  name: string;
  tag: string;
  hull: string; // main fuselage / wings
  nose: string; // nose cone + dark trim
  accent: string; // canopy, engine exhaust, cockpit glow, engine light
  premium?: boolean; // requires a $SPACEX premium unlock
}

// Ordered, index === id. First entry is the default.
export const SKINS: Skin[] = [
  { id: 0, name: 'FROST', tag: 'STANDARD ISSUE', hull: '#cbd5e1', nose: '#1e293b', accent: '#38bdf8' },
  { id: 1, name: 'INFERNO', tag: 'VOLCANIC PLATING', hull: '#7f1d1d', nose: '#1c0a0a', accent: '#fb923c' },
  { id: 2, name: 'VOID', tag: 'STEALTH COATING', hull: '#1e1b2e', nose: '#000000', accent: '#a855f7', premium: true },
  { id: 3, name: 'TOXIC', tag: 'BIO-HAZARD HULL', hull: '#3f6212', nose: '#0a1402', accent: '#a3e635' },
  { id: 4, name: 'SOLAR', tag: 'GILDED CHASSIS', hull: '#d4a017', nose: '#3b2606', accent: '#fde047', premium: true },
];

export interface Weapon {
  id: number;
  name: string;
  tag: string;
  color: string; // bolt + muzzle flash colour
  cooldown: number; // seconds between shots
  damage: number; // hp per hit
  bolts: number; // projectiles per shot
  spread: number; // total fan angle in radians (0 = single line)
  speed: number; // units / second
  radius: number; // bolt size + hit radius scale
  pierce: number; // extra enemies a bolt punches through
  premium?: boolean; // requires a $SPACEX premium unlock
}

export const WEAPONS: Weapon[] = [
  { id: 0, name: 'PLASMA', tag: 'BALANCED', color: '#4ade80', cooldown: 0.16, damage: 1, bolts: 1, spread: 0, speed: 46, radius: 1, pierce: 0 },
  { id: 1, name: 'TWIN ION', tag: 'RAPID FIRE', color: '#22d3ee', cooldown: 0.1, damage: 1, bolts: 2, spread: 0.08, speed: 54, radius: 0.9, pierce: 0 },
  { id: 2, name: 'SCATTER', tag: 'CLOSE RANGE', color: '#fbbf24', cooldown: 0.4, damage: 1, bolts: 5, spread: 0.6, speed: 40, radius: 1, pierce: 0 },
  { id: 3, name: 'RAILGUN', tag: 'PIERCING', color: '#f472b6', cooldown: 0.5, damage: 4, bolts: 1, spread: 0, speed: 80, radius: 1.6, pierce: 3, premium: true },
];

// Helper: is any premium item being used? (gating handled in UI)
export const PREMIUM_SKIN_IDS = SKINS.filter((s) => s.premium).map((s) => s.id);
export const PREMIUM_WEAPON_IDS = WEAPONS.filter((w) => w.premium).map((w) => w.id);

export type MissionType = 'kills' | 'fragments' | 'wave' | 'boss';

export interface Mission {
  id: number;
  title: string;
  desc: string;
  type: MissionType;
  target: number; // cumulative threshold on the matching counter
  reward: number; // bonus score on completion
}

// Sequential objectives. Progress is read from cumulative run counters.
export const MISSIONS: Mission[] = [
  { id: 0, title: 'FIRST CONTACT', desc: 'Destroy 5 hostiles', type: 'kills', target: 5, reward: 500 },
  { id: 1, title: 'SALVAGE RUN', desc: 'Harvest 10 star fragments', type: 'fragments', target: 10, reward: 600 },
  { id: 2, title: 'HOLD THE LINE', desc: 'Survive to wave 3', type: 'wave', target: 3, reward: 800 },
  { id: 3, title: 'LEVIATHAN', desc: 'Bring down a Behemoth', type: 'boss', target: 1, reward: 1500 },
  { id: 4, title: 'DEEP SURVEY', desc: 'Destroy 25 hostiles', type: 'kills', target: 25, reward: 1200 },
  { id: 5, title: 'EXTINCTION', desc: 'Slay 3 Behemoths', type: 'boss', target: 3, reward: 3000 },
];
