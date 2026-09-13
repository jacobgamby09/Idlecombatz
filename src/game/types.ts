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
  version: 2; gold: number; levels: Levels; ability: Ability;
  floor: number; bossDefeated: boolean;
  heroHp: number; cooldowns: Record<Ability, number>; respawnIn: number;
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
}
export interface SceneController {
  pause(): void; resume(): void; startOver(): void; destroy(): void;
  setAbility(ability: Ability): void; buyUpgrade(id: UpgradeId): PurchaseResult;
  setFloor(id: number): PurchaseResult; startBoss(): PurchaseResult; leaveBoss(): void;
  getSnapshot(): Snapshot;
}
