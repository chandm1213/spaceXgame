import { create } from 'zustand';
import * as THREE from 'three';
import { uid } from './world';
import { MISSIONS } from './loadout';

export type GameStatus = 'menu' | 'playing' | 'gameover';

// 0 = Stalker (purple), 1 = Drone (green), 2 = Behemoth boss (red)
export type AlienKind = 0 | 1 | 2;

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

const ALIEN_HP: Record<AlienKind, number> = { 0: 2, 1: 1, 2: 45 };

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

  // Loadout (persists across runs within a session)
  skinId: number;
  weaponId: number;

  // Mission progress
  missionIndex: number;
  missionFlash: number; // timestamp of last mission completion, drives HUD banner

  aliens: AlienData[];
  bolts: BoltData[];
  crystals: CrystalData[];
  asteroids: AsteroidData[];
  booms: BoomData[];

  start: () => void;
  gameOver: () => void;

  setSkin: (id: number) => void;
  setWeapon: (id: number) => void;

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

  skinId: 0,
  weaponId: 0,

  missionIndex: 0,
  missionFlash: 0,

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
      newRecord: false,
      missionIndex: 0,
      missionFlash: 0,
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

  spawnAlien: (pos, kind) =>
    set((s) => ({
      aliens: [
        ...s.aliens,
        { id: uid(), pos: pos.clone(), hp: ALIEN_HP[kind], maxHp: ALIEN_HP[kind], seed: Math.random() * 100, kind },
      ],
    })),

  killAlien: (id, byCrash) => {
    const s = get();
    const alien = s.aliens.find((a) => a.id === id);
    if (!alien) return;
    const drops: CrystalData[] = [];
    if (!byCrash) {
      // Star fragments scatter from the kill in low gravity
      const count = alien.kind === 2 ? 9 : alien.kind === 0 ? 3 : 2;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 1 + Math.random() * (alien.kind === 2 ? 4 : 2.5);
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
    }
    const gained = alien.kind === 2 ? 750 : 100;
    set({
      aliens: s.aliens.filter((a) => a.id !== id),
      crystals: [...s.crystals, ...drops],
      booms: [
        ...s.booms,
        {
          id: uid(),
          pos: alien.pos.clone(),
          color: alien.kind === 2 ? '#f87171' : alien.kind === 0 ? '#c084fc' : '#4ade80',
          big: alien.kind !== 1,
        },
      ],
      score: byCrash ? s.score : s.score + gained,
      kills: byCrash ? s.kills : s.kills + 1,
      bossKills: byCrash || alien.kind !== 2 ? s.bossKills : s.bossKills + 1,
    });
    if (!byCrash) checkMission(get, set);
  },

  addBolt: (bolt) =>
    set((s) => ({
      bolts: [...s.bolts, { ...bolt, id: uid(), born: performance.now() }],
    })),

  removeBolt: (id) => set((s) => ({ bolts: s.bolts.filter((b) => b.id !== id) })),

  collectCrystal: (id) => {
    set((s) => ({
      crystals: s.crystals.filter((c) => c.id !== id),
      fragments: s.fragments + 1,
      score: s.score + 25,
      oxygen: Math.min(100, s.oxygen + 5),
      fuel: Math.min(100, s.fuel + 4),
    }));
    checkMission(get, set);
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
    const drops: CrystalData[] = [];
    if (!byCrash) {
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
    }
    set({
      asteroids: s.asteroids.filter((a) => a.id !== id),
      crystals: [...s.crystals, ...drops],
      booms: [
        ...s.booms,
        { id: uid(), pos: rock.pos.clone(), color: '#fbbf24', big: rock.big },
      ],
      score: byCrash ? s.score : s.score + (rock.big ? 120 : 40),
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
