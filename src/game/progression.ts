import { DEMO } from './balance.ts';
import type { HeroStats, Levels, UpgradeId, UpgradeView } from './types.ts';

export const UPGRADE_IDS: UpgradeId[] = ['atk', 'hp', 'def', 'respawn'];
export const UPGRADES = {
  atk: { name: 'Attack', description: 'Stronger sword hits & Power Strike.', price: 6, growth: 1.18, cap: 100 },
  hp: { name: 'Max health', description: 'Stronger Heal. Does not heal on purchase.', price: 6, growth: 1.18, cap: 100 },
  def: { name: 'Defense', description: 'Reduce damage from every enemy hit.', price: 4, growth: 1.18, cap: 100 },
  respawn: { name: 'Recovery', description: 'Less downtime after your next death.', price: 8, growth: 1.25, cap: 15 },
} as const;
export const freshLevels = (): Levels => ({ atk: 0, hp: 0, def: 0, respawn: 0 });
export const heroStats = (levels: Levels): HeroStats => ({
  atk: DEMO.heroAtk + 4 * levels.atk,
  maxHp: DEMO.heroHp + 32 * levels.hp,
  def: DEMO.heroDef + 8 * levels.def,
  respawn: Math.max(2, DEMO.respawnSeconds - levels.respawn * 0.2),
});
export function upgradePrice(id: UpgradeId, level: number): number | null {
  const definition = UPGRADES[id];
  if (!Number.isInteger(level) || level < 0 || level >= definition.cap) return null;
  return Math.ceil(definition.price * definition.growth ** level);
}
export function upgradeViews(levels: Levels, gold: number): UpgradeView[] {
  const stats = heroStats(levels);
  return UPGRADE_IDS.map(id => {
    const price = upgradePrice(id, levels[id]);
    const next = heroStats({ ...levels, [id]: levels[id] + (price === null ? 0 : 1) });
    const key = id === 'hp' ? 'maxHp' : id;
    return { id, ...UPGRADES[id], level: levels[id], value: stats[key], nextValue: next[key], price,
      affordable: price !== null && gold >= price };
  });
}
