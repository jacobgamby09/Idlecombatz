import { DEMO, MAX_GOLD } from './balance.ts';
import { heroStats, UPGRADE_IDS, UPGRADES } from './progression.ts';
import { dungeonFor, fits, cell, walkable } from './dungeon/layouts.ts';
import { BOSS, floorById } from './world.ts';
import type { Levels, SaveData, RunSave } from './types.ts';
export const SAVE_KEY = 'idlecombatz.save';
export const BACKUP_KEY = 'idlecombatz.save.pre-dungeon';
export type SaveStorage = Pick<Storage, 'getItem' | 'setItem'>;
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const bounded = (v: unknown, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max;
const integer = (v: unknown, max: number): v is number => bounded(v, max) && Number.isSafeInteger(v);
function requireValid(condition: unknown): asserts condition { if (!condition) throw new Error('Invalid save'); }
export function parseSave(raw: string): SaveData {
  const d: unknown = JSON.parse(raw);
  requireValid(record(d) && [1, 2, 3].includes(Number(d.version)) && typeof d.version === 'number' && record(d.levels) && record(d.cooldowns));
  for (const id of UPGRADE_IDS) requireValid(integer(d.levels[id], UPGRADES[id].cap));
  const levels = Object.fromEntries(UPGRADE_IDS.map(id => [id, (d.levels as Levels)[id]])) as Levels;
  const floor = d.version === 1 ? 1 : d.floor;
  const bossDefeated = d.version === 1 ? false : d.bossDefeated;
  requireValid(integer(floor, 4) && floor >= 1 && typeof bossDefeated === 'boolean' && (floor !== 4 || bossDefeated));
  requireValid(integer(d.gold, MAX_GOLD) && (d.ability === 'heal' || d.ability === 'power-strike')
    && bounded(d.heroHp, heroStats(levels).maxHp) && bounded(d.respawnIn, DEMO.respawnSeconds)
    && bounded(d.cooldowns.heal, DEMO.healCooldown) && bounded(d.cooldowns['power-strike'], DEMO.powerCooldown)
    && (d.heroHp > 0 ? d.respawnIn === 0 : d.respawnIn > 0));
  const base: SaveData = { version: 3, floor, bossDefeated, gold: d.gold, levels, ability: d.ability,
    heroHp: d.heroHp, respawnIn: d.respawnIn, cooldowns: { heal: d.cooldowns.heal, 'power-strike': d.cooldowns['power-strike'] },
    unlockedFloor: bossDefeated ? 4 : 3, clearedFloors: [], advanceFloors: false, failures: 0, completedRuns: 0, run: null };
  if (d.version !== 3) return base;
  requireValid(integer(d.unlockedFloor, 4) && d.unlockedFloor >= floor && (d.unlockedFloor !== 4 || bossDefeated)
    && Array.isArray(d.clearedFloors) && d.clearedFloors.length <= 4 && new Set(d.clearedFloors).size === d.clearedFloors.length
    && d.clearedFloors.every(f => integer(f, d.unlockedFloor as number) && f >= 1)
    && typeof d.advanceFloors === 'boolean' && integer(d.failures, 1000000) && integer(d.completedRuns, 1000000000));
  Object.assign(base, { unlockedFloor: d.unlockedFloor, clearedFloors: [...d.clearedFloors], advanceFloors: d.advanceFloors, failures: d.failures, completedRuns: d.completedRuns });
  if (bossDefeated) requireValid(base.unlockedFloor === 4);
  if (d.run === null) return base;
  const r = d.run, map = dungeonFor(floor);
  requireValid(record(r) && r.layout === map.id && integer(r.revision, 1000000) && r.revision >= 1 && integer(r.id, 1000000000)
    && Array.isArray(r.actors) && r.actors.length >= 1 && r.actors.length <= 100 && Array.isArray(r.chests) && r.chests.length <= 100
    && Array.isArray(r.explored) && r.explored.length <= 100000 && r.explored.every(v => v === 0 || v === 1)
    && typeof r.completed === 'boolean' && bounded(r.transition, 3) && ['farming', 'boss', 'victory'].includes(String(r.mode))
    && bounded(r.bossSeconds, BOSS.seconds) && [null, 'victory', 'defeat'].includes(r.bossResult as null)
    && bounded(r.elapsed, 1e12) && integer(r.randomState, 0xffffffff));
  const current = r.revision === map.revision;
  const expectedRooms = [0, ...map.rooms.filter(room => room.kind === 'combat' || room.kind === 'boss').flatMap(room => Array<number>(room.kind === 'boss' ? 1 : 3).fill(room.id))];
  if (current) requireValid(r.actors.length === expectedRooms.length && r.chests.length === map.chests.length && r.explored.length === map.tiles.length);
  const ids = new Set<number>();
  for (let i = 0; i < r.actors.length; i++) {
    const a = r.actors[i]; requireValid(record(a));
    requireValid(integer(a.id, 1000) && a.id > 0 && !ids.has(a.id) && ['hero', 'skeleton', 'boss'].includes(String(a.kind))
      && (i === 0 ? a.kind === 'hero' : a.kind !== 'hero') && bounded(a.maxHp, 1e7) && a.maxHp > 0 && bounded(a.hp, a.maxHp)
      && bounded(a.x, map.width * 16) && bounded(a.y, map.height * 16) && bounded(a.homeX, map.width * 16) && bounded(a.homeY, map.height * 16)
      && (a.facing === 1 || a.facing === -1) && ['idle', 'walk', 'attack', 'dead'].includes(String(a.state))
      && (a.hp === 0 ? a.state === 'dead' : a.state !== 'dead') && integer(a.room, 6)
      && bounded(a.stateTime, 1e12) && bounded(a.attackWait, 10) && integer(a.attackTarget, 1000)
      && typeof a.attackPower === 'boolean' && bounded(a.attackDamage, 1e7) && typeof a.hitDelivered === 'boolean'
      && bounded(a.flash, .15) && (a.flashKind === 'hit' || a.flashKind === 'heal') && bounded(a.spawnTime, 1e12) && typeof a.active === 'boolean');
    if (current) {
      requireValid(a.id === i + 1 && a.room === expectedRooms[i] && fits(map, { x: a.x, y: a.y }, a.kind === 'boss' ? 12 : 5)
        && fits(map, { x: a.homeX, y: a.homeY }, a.kind === 'boss' ? 12 : 5));
      const expectedKind = i === 0 ? 'hero' : map.rooms[expectedRooms[i]].kind === 'boss' ? 'boss' : 'skeleton';
      requireValid(a.kind === expectedKind);
      requireValid(i === 0 ? a.hp === d.heroHp && a.maxHp === heroStats(levels).maxHp : a.kind === 'boss' ? a.maxHp === BOSS.hp : a.maxHp >= Math.round(68 * floorById(floor).hp) && a.maxHp <= Math.round(102 * floorById(floor).hp));
    }
    ids.add(a.id);
  }
  for (const a of r.actors) requireValid(a.attackTarget === 0 || ids.has(a.attackTarget));
  for (let i = 0; i < r.chests.length; i++) {
    const c = r.chests[i]; requireValid(record(c) && integer(c.id, 100) && integer(c.room, 6) && bounded(c.x, map.width * 16) && bounded(c.y, map.height * 16) && typeof c.opened === 'boolean');
    if (current) requireValid(c.id === map.chests[i].id && c.room === map.chests[i].room && c.x === map.chests[i].x && c.y === map.chests[i].y);
  }
  requireValid(r.order === null || (record(r.order) && (r.order.kind === 'move' ? bounded(r.order.x, map.width * 16) && bounded(r.order.y, map.height * 16) : (r.order.kind === 'chest' || r.order.kind === 'enemy') && integer(r.order.id, 1000))));
  if (current && record(r.order)) {
    const o = r.order;
    if (o.kind === 'move') requireValid(walkable(map, o.x as number, o.y as number) && r.explored[cell(map, { x: o.x as number, y: o.y as number })]);
    else requireValid(o.kind === 'chest' ? r.chests.some(c => c.id === o.id) : r.actors.some(a => a.kind !== 'hero' && a.id === o.id));
  }
  if (r.mode === 'boss') requireValid(floor === 3 && d.heroHp > 0 && r.bossSeconds > 0 && r.transition === 0 && !r.completed && r.actors.some(a => a.kind === 'boss' && a.hp > 0));
  if (r.mode === 'victory') requireValid(floor === 3 && bossDefeated && d.heroHp > 0 && r.transition > 0 && r.bossResult === 'victory' && r.actors.some(a => a.kind === 'boss' && a.hp === 0));
  if (r.mode === 'farming' && r.transition > 0) requireValid(r.completed);
  if (r.completed) requireValid(r.actors.every(a => a.kind === 'hero' || a.hp === 0) && r.chests.every(c => c.opened) && r.transition > 0 && base.clearedFloors.includes(floor));
  base.run = r as unknown as RunSave; return base;
}

/** Preserve legacy bytes before first migration write; unavailable storage never stops play. */
export class SaveStore {
  message = ''; blocked = false; private lastSaved = ''; private pendingBackup: string | null = null;
  private getStorage: () => SaveStorage;
  constructor(getStorage: () => SaveStorage) { this.getStorage = getStorage; }
  load(): SaveData | undefined {
    let raw: string | null;
    try { raw = this.getStorage().getItem(SAVE_KEY); }
    catch { this.blocked = true; this.message = 'Saving is unavailable. Progress stays in this session only.'; return; }
    if (raw === null) return;
    try {
      const data = parseSave(raw); this.lastSaved = raw;
      if (JSON.parse(raw).version < 3) this.pendingBackup = raw;
      return data;
    } catch { this.blocked = true; this.message = 'Your existing save could not be loaded. It is preserved. Use Start over in Settings to replace it.'; return; }
  }
  write(data: SaveData): boolean {
    if (this.blocked) return false;
    const raw = JSON.stringify(data); if (raw === this.lastSaved) return true;
    try {
      const storage = this.getStorage();
      if (this.pendingBackup !== null) { if (storage.getItem(BACKUP_KEY) === null) storage.setItem(BACKUP_KEY, this.pendingBackup); }
      storage.setItem(SAVE_KEY, raw); this.pendingBackup = null; this.lastSaved = raw; this.message = ''; return true;
    } catch { this.message = 'Saving failed. Keep this page open to retain your progress.'; return false; }
  }
  replace(data: SaveData) { this.blocked = false; this.lastSaved = ''; this.pendingBackup = null; return this.write(data); }
}
