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
  version: 1; gold: number; levels: Levels; ability: Ability;
  heroHp: number; cooldowns: Record<Ability, number>; respawnIn: number;
}
export interface Snapshot {
  heroHp: number; maxHp: number; gold: number; stats: HeroStats;
  ability: Ability; abilityCooldown: number; abilityMaxCooldown: number;
  abilities: Record<Ability, { amount: number; cooldown: number }>;
  respawnIn: number; isPaused: boolean; upgrades: UpgradeView[]; saveMessage: string;
}
export interface SceneController {
  pause(): void; resume(): void; startOver(): void; destroy(): void;
  setAbility(ability: Ability): void; buyUpgrade(id: UpgradeId): PurchaseResult;
  getSnapshot(): Snapshot;
}
