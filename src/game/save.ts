import { DEMO, MAX_GOLD } from './balance.ts';
import { heroStats, UPGRADE_IDS, UPGRADES } from './progression.ts';
import type { Levels, SaveData } from './types.ts';

export const SAVE_KEY = 'idlecombatz.save';
export type SaveStorage = Pick<Storage, 'getItem' | 'setItem'>;
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const bounded = (value: unknown, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max;

export function parseSave(raw: string): SaveData {
  const data: unknown = JSON.parse(raw);
  if (!record(data) || (data.version !== 1 && data.version !== 2) || !record(data.levels) || !record(data.cooldowns)) throw new Error('Unsupported save');
  const floor = data.version === 1 ? 1 : data.floor;
  const bossDefeated = data.version === 1 ? false : data.bossDefeated;
  if (!bounded(floor, 4) || !Number.isInteger(floor) || floor < 1 || typeof bossDefeated !== 'boolean'
    || (floor === 4 && !bossDefeated)) throw new Error('Invalid world progress');
  for (const id of UPGRADE_IDS) {
    if (!bounded(data.levels[id], UPGRADES[id].cap) || !Number.isInteger(data.levels[id])) throw new Error('Invalid level');
  }
  const levels = Object.fromEntries(UPGRADE_IDS.map(id => [id, (data.levels as Levels)[id]])) as Levels;
  if (!bounded(data.gold, MAX_GOLD) || !Number.isSafeInteger(data.gold)
    || (data.ability !== 'heal' && data.ability !== 'power-strike')
    || !bounded(data.heroHp, heroStats(levels).maxHp)
    || !bounded(data.respawnIn, DEMO.respawnSeconds)
    || !bounded(data.cooldowns.heal, DEMO.healCooldown)
    || !bounded(data.cooldowns['power-strike'], DEMO.powerCooldown)
    || (data.heroHp > 0 && data.respawnIn !== 0)
    || (data.heroHp === 0 && data.respawnIn === 0)) throw new Error('Invalid save');
  return { version: 2, floor, bossDefeated, gold: data.gold, levels, ability: data.ability, heroHp: data.heroHp,
    respawnIn: data.respawnIn, cooldowns: { heal: data.cooldowns.heal, 'power-strike': data.cooldowns['power-strike'] } };
}

/** Storage is acquired inside try/catch: even accessing localStorage can throw. */
export class SaveStore {
  message = '';
  blocked = false;
  private lastSaved = '';
  private getStorage: () => SaveStorage;
  constructor(getStorage: () => SaveStorage) { this.getStorage = getStorage; }
  load(): SaveData | undefined {
    let raw: string | null;
    try { raw = this.getStorage().getItem(SAVE_KEY); }
    catch { this.blocked = true; this.message = 'Saving is unavailable. Progress stays in this session only.'; return; }
    if (raw === null) return;
    try { const data = parseSave(raw); this.lastSaved = raw; return data; }
    catch {
      this.blocked = true;
      this.message = 'Your existing save could not be loaded. It is preserved. Use Start over in Settings to replace it.';
      return;
    }
  }
  write(data: SaveData): boolean {
    if (this.blocked) return false;
    const raw = JSON.stringify(data);
    if (raw === this.lastSaved) return true;
    try { this.getStorage().setItem(SAVE_KEY, raw); this.lastSaved = raw; this.message = ''; return true; }
    catch { this.message = 'Saving failed. Keep this page open to retain your progress.'; return false; }
  }
  replace(data: SaveData) { this.blocked = false; this.lastSaved = ''; return this.write(data); }
}
