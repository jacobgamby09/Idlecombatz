import type { Actor } from './simulation.ts';
import type { Chest, Point } from './dungeon/layouts.ts';
export type HeroOrder = ({ kind: 'move' } & Point) | { kind: 'enemy' | 'chest'; id: number };
export interface RunSave {
  layout: string; revision: number; id: number; actors: Actor[]; chests: Chest[]; explored: number[];
  completed: boolean; transition: number; mode: 'farming' | 'boss' | 'victory'; bossSeconds: number;
  bossResult: 'victory' | 'defeat' | null; elapsed: number; randomState: number; order: HeroOrder | null;
}
export type Ability = 'power-strike' | 'heal';
export type UpgradeId = 'atk' | 'hp' | 'def' | 'respawn';
export type Levels = Record<UpgradeId, number>;
export interface HeroStats { atk: number; maxHp: number; def: number; respawn: number }
export interface UpgradeView {
  id: UpgradeId; name: string; description: string; level: number;
  value: number; nextValue: number; price: number | null; affordable: boolean;
}
export type PurchaseResult = { ok: true } | { ok: false; reason: string };
export interface SaveData {
  version: 3; gold: number; levels: Levels; ability: Ability;
  floor: number; bossDefeated: boolean;
  heroHp: number; cooldowns: Record<Ability, number>; respawnIn: number;
  unlockedFloor: number; clearedFloors: number[]; advanceFloors: boolean; failures: number; completedRuns: number; run: RunSave | null;
}
export interface Snapshot {
  heroHp: number; maxHp: number; gold: number; stats: HeroStats;
  ability: Ability; abilityCooldown: number; abilityMaxCooldown: number;
  abilities: Record<Ability, { amount: number; cooldown: number }>;
  respawnIn: number; isPaused: boolean; upgrades: UpgradeView[]; saveMessage: string;
  floor: number; region: string; bossDefeated: boolean; mode: 'farming' | 'boss' | 'victory';
  bossHp: number; bossMaxHp: number; bossSeconds: number; goldPerMinute: number;
  secondaryCooldown: number; secondaryMaxCooldown: number; bossResult: 'victory' | 'defeat' | null;
  victoryReady: boolean;
  activity: string; notice: string; manualOrder: boolean; roomsCleared: number; roomCount: number;
  chestsOpened: number; chestCount: number; advanceFloors: boolean; unlockedFloor: number; completedRuns: number;
  map: { width: number; height: number; tiles: number[]; explored: number[]; hero: Point;
    rooms: { id: number; name: string; x: number; y: number; known: boolean; cleared: boolean; kind: string }[] };
}
export interface SceneController {
  pause(): void; resume(): void; startOver(): void; destroy(): void;
  setAbility(ability: Ability): void; buyUpgrade(id: UpgradeId): PurchaseResult;
  setFloor(id: number): PurchaseResult; startBoss(): PurchaseResult; leaveBoss(): void;
  getSnapshot(): Snapshot;
  auto(): void; command(order: HeroOrder): PurchaseResult; visitRoom(id: number): PurchaseResult; setProgression(advance: boolean): void;
}
