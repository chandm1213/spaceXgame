import { create } from 'zustand';
import * as THREE from 'three';
import { uid } from './world';
import { MISSIONS } from './loadout';

export type GameStatus = 'menu' | 'playing' | 'gameover';

// 0 = Stalker (purple), 1 = Drone (green), 2 = Behemoth boss (red), 3 = Mothership (magenta)
export type AlienKind = 0 | 1 | 2 | 3;

export interface AlienData {
  id: number;
  pos: THREE.Vector3; // mutated in place every frame
  hp: number;
  maxHp: number;
  seed: number;
  kind: AlienKind;
}

export interface BoltData {
  id: number;
  pos: THREE.Vector3;
  dir: THREE.Vector3;
  born: number;
  color: string;
  damage: number;
  speed: number;
  radius: number;
  pierce: number; // remaining enemies this bolt can punch through
}

export interface CrystalData {
  id: number;
  pos: THREE.Vector3;
  seed: number;
}

// Drifting rock hazard. big === true is a meteoroid (tankier, hits harder).
export interface AsteroidData {
  id: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  hp: number;
  seed: number;
  radius: number;
  big: boolean;
}

export interface BoomData {
  id: number;
  pos: THREE.Vector3;
  color: string;
  big: boolean;
}

const ALIEN_HP: Record<AlienKind, number> = { 0: 2, 1: 1, 2: 45, 3: 130 };

// Overdrive charge gained per hostile destroyed (caps at 100 = ready)
const OVERDRIVE_CHARGE: Record<AlienKind, number> = { 0: 7, 1: 5, 2: 38, 3: 55 };

const HIGHSCORE_KEY = 'sbh-highscore';
function loadHighScore() {
  if (typeof window === 'undefined') return 0;
  return Number(localStorage.getItem(HIGHSCORE_KEY)) || 0;
}

interface GameState {
  status: GameStatus;
  score: number;
  fragments: number;
  fuel: number;
  oxygen: number;
  shields: number;
  wave: number;
  kills: number;
  bossKills: number;
  hitFlash: number; // timestamp of last shield hit, drives red flash in HUD

  // Persistent best score + whether the last run beat it
  highScore: number;
  newRecord: boolean;

  // OVERDRIVE — kills charge the meter; at 100 the pilot can unleash a
  // BLACK HORIZON supernova that wipes the field and slows time.
  overdrive: number; // 0..100 charge
  overdriveActive: boolean; // true during the supernova window
  overdriveFlash: number; // timestamp of last detonation, drives HUD + shockwave

  // Loadout (persists across runs within a session)
  skinId: number;
  weaponId: number;

  // Mission progress
  missionIndex: number;
  missionFlash: number; // timestamp of last mission completion, drives HUD banner

  // Wormhole / zone escalation
  zone: number; // current zone — climbs each time you warp; enemies get tougher
  wormhole: THREE.Vector3 | null; // open portal position, null when none present
  warpFlash: number; // timestamp of last warp, drives HUD flash + zone banner

  aliens: AlienData[];
  bolts: BoltData[];
  crystals: CrystalData[];
  asteroids: AsteroidData[];
  booms: BoomData[];

  start: () => void;
  gameOver: () => void;

  setSkin: (id: number) => void;
  setWeapon: (id: number) => void;

  detonateOverdrive: () => void;
  endOverdrive: () => void;

  spawnAlien: (pos: THREE.Vector3, kind: AlienKind) => void;
  killAlien: (id: number, byCrash: boolean) => void;
  addBolt: (bolt: Omit<BoltData, 'id' | 'born'>) => void;
  removeBolt: (id: number) => void;
  collectCrystal: (id: number) => void;
  spawnAsteroid: (pos: THREE.Vector3, vel: THREE.Vector3, big: boolean) => void;
  destroyAsteroid: (id: number, byCrash: boolean) => void;
  removeAsteroid: (id: number) => void;
  removeBoom: (id: number) => void;
  damage: (amount: number) => void;
  drain: (fuelLoss: number, oxygenLoss: number) => void;
  setWave: (wave: number) => void;
  openWormhole: (pos: THREE.Vector3) => void;
  enterWormhole: () => void;
}

export const useGame = create<GameState>((set, get) => ({
  status: 'menu',
  score: 0,
  fragments: 0,
  fuel: 100,
  oxygen: 100,
  shields: 100,
  wave: 1,
  kills: 0,
  bossKills: 0,
  hitFlash: 0,

  highScore: loadHighScore(),
  newRecord: false,

  overdrive: 0,
  overdriveActive: false,
  overdriveFlash: 0,

  skinId: 0,
  weaponId: 0,

  missionIndex: 0,
  missionFlash: 0,

  zone: 1,
  wormhole: null,
  warpFlash: 0,

  aliens: [],
  bolts: [],
  crystals: [],
  asteroids: [],
  booms: [],

  start: () =>
    set({
      status: 'playing',
      score: 0,
      fragments: 0,
      fuel: 100,
      oxygen: 100,
      shields: 100,
      wave: 1,
      kills: 0,
      bossKills: 0,
      hitFlash: 0,
      overdrive: 0,
      overdriveActive: false,
      overdriveFlash: 0,
      newRecord: false,
      missionIndex: 0,
      missionFlash: 0,
      zone: 1,
      wormhole: null,
      warpFlash: 0,
      aliens: [],
      bolts: [],
      crystals: [],
      asteroids: [],
      booms: [],
    }),

  gameOver: () => {
    const s = get();
    if (s.status === 'gameover') return;
    const newRecord = s.score > s.highScore;
    const highScore = Math.max(s.score, s.highScore);
    if (newRecord && typeof window !== 'undefined') {
      localStorage.setItem(HIGHSCORE_KEY, String(highScore));
    }
    set({ status: 'gameover', highScore, newRecord });
  },

  setSkin: (id) => set({ skinId: id }),
  setWeapon: (id) => set({ weaponId: id }),

  // BLACK HORIZON supernova: at full charge, annihilate every hostile in the
  // field at once, banking their score, and trigger the slow-motion window.
  detonateOverdrive: () => {
    const s = get();
    if (s.overdriveActive || s.overdrive < 100 || s.status !== 'playing') return;
    let score = s.score;
    let kills = s.kills;
    let bossKills = s.bossKills;
    const booms: BoomData[] = [...s.booms];
    for (const a of s.aliens) {
      const isApex = a.kind === 2 || a.kind === 3;
      score += a.kind === 3 ? 2500 : a.kind === 2 ? 750 : 100;
      kills += 1;
      if (isApex) bossKills += 1;
      booms.push({
        id: uid(),
        pos: a.pos.clone(),
        color:
          a.kind === 3 ? '#e879f9'
          : a.kind === 2 ? '#f87171'
          : a.kind === 0 ? '#c084fc'
          : '#4ade80',
        big: a.kind !== 1,
      });
    }
    for (const r of s.asteroids) {
      score += r.big ? 120 : 40;
      booms.push({ id: uid(), pos: r.pos.clone(), color: '#fbbf24', big: r.big });
    }
    set({
      aliens: [],
      asteroids: [],
      booms,
      score,
      kills,
      bossKills,
      overdrive: 0,
      overdriveActive: true,
      overdriveFlash: performance.now(),
    });
    checkMission(get, set);
  },

  endOverdrive: () => set({ overdriveActive: false }),

  spawnAlien: (pos, kind) =>
    set((s) => {
      // Deeper zones spawn tougher hostiles: +50% HP per zone past the first
      const hp = Math.round(ALIEN_HP[kind] * (1 + (s.zone - 1) * 0.5));
      return {
        aliens: [
          ...s.aliens,
          { id: uid(), pos: pos.clone(), hp, maxHp: hp, seed: Math.random() * 100, kind },
        ],
      };
    }),

  killAlien: (id, byCrash) => {
    const s = get();
    const alien = s.aliens.find((a) => a.id === id);
    if (!alien) return;
    const isApex = alien.kind === 2 || alien.kind === 3; // bosses
    // Star fragments always scatter, even on crash — crash damage is already the penalty
    const drops: CrystalData[] = [];
    const count = alien.kind === 3 ? 14 : alien.kind === 2 ? 9 : alien.kind === 0 ? 3 : 2;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1 + Math.random() * (isApex ? 5 : 2.5);
      drops.push({
        id: uid(),
        pos: new THREE.Vector3(
          alien.pos.x + Math.cos(angle) * radius,
          1.6 + Math.random() * 1.5,
          alien.pos.z + Math.sin(angle) * radius
        ),
        seed: Math.random() * 100,
      });
    }
    const gained = alien.kind === 3 ? 2500 : alien.kind === 2 ? 750 : 100;
    const boomColor =
      alien.kind === 3 ? '#e879f9'
      : alien.kind === 2 ? '#f87171'
      : alien.kind === 0 ? '#c084fc'
      : '#4ade80';
    // Charge OVERDRIVE only on real kills — capped at 100
    const overdrive = byCrash
      ? s.overdrive
      : Math.min(100, s.overdrive + OVERDRIVE_CHARGE[alien.kind]);
    set({
      aliens: s.aliens.filter((a) => a.id !== id),
      crystals: [...s.crystals, ...drops],
      booms: [
        ...s.booms,
        { id: uid(), pos: alien.pos.clone(), color: boomColor, big: alien.kind !== 1 },
      ],
      score: byCrash ? s.score : s.score + gained,
      kills: byCrash ? s.kills : s.kills + 1,
      bossKills: byCrash || !isApex ? s.bossKills : s.bossKills + 1,
      overdrive,
    });
    if (!byCrash) checkMission(get, set);
  },

  addBolt: (bolt) =>
    set((s) => ({
      bolts: [...s.bolts, { ...bolt, id: uid(), born: performance.now() }],
    })),

  removeBolt: (id) => set((s) => ({ bolts: s.bolts.filter((b) => b.id !== id) })),

  collectCrystal: (id) => {
    let counted = false;
    set((s) => {
      if (!s.crystals.some((c) => c.id === id)) return s;
      counted = true;
      return {
        crystals: s.crystals.filter((c) => c.id !== id),
        fragments: s.fragments + 1,
        score: s.score + 25,
        oxygen: Math.min(100, s.oxygen + 5),
        fuel: Math.min(100, s.fuel + 4),
      };
    });
    if (counted) checkMission(get, set);
  },

  spawnAsteroid: (pos, vel, big) =>
    set((s) => ({
      asteroids: [
        ...s.asteroids,
        {
          id: uid(),
          pos: pos.clone(),
          vel: vel.clone(),
          hp: big ? 8 : 3,
          seed: Math.random() * 100,
          radius: big ? 3.4 : 1.6,
          big,
        },
      ],
    })),

  destroyAsteroid: (id, byCrash) => {
    const s = get();
    const rock = s.asteroids.find((a) => a.id === id);
    if (!rock) return;
    // Crystal shards always drop — crash damage is already the penalty
    const drops: CrystalData[] = [];
    const count = rock.big ? 4 : 2;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.5 + Math.random() * rock.radius;
      drops.push({
        id: uid(),
        pos: new THREE.Vector3(
          rock.pos.x + Math.cos(angle) * radius,
          1.6 + Math.random() * 1.5,
          rock.pos.z + Math.sin(angle) * radius
        ),
        seed: Math.random() * 100,
      });
    }
    set({
      asteroids: s.asteroids.filter((a) => a.id !== id),
      crystals: [...s.crystals, ...drops],
      booms: [
        ...s.booms,
        { id: uid(), pos: rock.pos.clone(), color: '#fbbf24', big: rock.big },
      ],
      score: byCrash ? s.score : s.score + (rock.big ? 120 : 40),
      overdrive: byCrash ? s.overdrive : Math.min(100, s.overdrive + (rock.big ? 4 : 2)),
    });
  },

  removeAsteroid: (id) => set((s) => ({ asteroids: s.asteroids.filter((a) => a.id !== id) })),

  removeBoom: (id) => set((s) => ({ booms: s.booms.filter((b) => b.id !== id) })),

  damage: (amount) => {
    const shields = Math.max(0, get().shields - amount);
    set({ shields, hitFlash: performance.now() });
    if (shields <= 0) get().gameOver();
  },

  drain: (fuelLoss, oxygenLoss) => {
    const s = get();
    const fuel = Math.max(0, s.fuel - fuelLoss);
    const oxygen = Math.max(0, s.oxygen - oxygenLoss);
    set({ fuel, oxygen });
    if (oxygen <= 0) s.gameOver();
  },

  setWave: (wave) => {
    set({ wave });
    checkMission(get, set);
  },

  openWormhole: (pos) => set({ wormhole: pos.clone() }),

  enterWormhole: () => {
    const s = get();
    if (!s.wormhole) return;
    // Reward for surviving: warp to a tougher zone, top off life support, clear the field
    set({
      zone: s.zone + 1,
      wormhole: null,
      warpFlash: performance.now(),
      score: s.score + 2000,
      shields: Math.min(100, s.shields + 40),
      fuel: 100,
      oxygen: 100,
      wave: s.wave + 2,
      aliens: [],
      asteroids: [],
      bolts: [],
      crystals: [],
      booms: [],
    });
    checkMission(get, set);
  },
}));

// Advance the mission ladder whenever a tracked counter changes.
function checkMission(get: () => GameState, set: (partial: Partial<GameState>) => void) {
  const s = get();
  let index = s.missionIndex;
  let score = s.score;
  let advanced = false;
  while (index < MISSIONS.length) {
    const m = MISSIONS[index];
    const value =
      m.type === 'kills' ? s.kills
      : m.type === 'fragments' ? s.fragments
      : m.type === 'wave' ? s.wave
      : s.bossKills;
    if (value < m.target) break;
    score += m.reward;
    index += 1;
    advanced = true;
  }
  if (advanced) set({ missionIndex: index, score, missionFlash: performance.now() });
}
