import { writeFileSync } from 'node:fs';
import { CombatSimulation } from '../src/game/simulation.ts';
const results = [];
for (const [name, levels, ability] of [
  ['starter', {atk:0,hp:0,def:0,respawn:0}, 'power-strike'],
  ['offense', {atk:6,hp:0,def:0,respawn:0}, 'power-strike'],
  ['sustain', {atk:0,hp:4,def:4,respawn:0}, 'heal'],
  ['established', {atk:12,hp:12,def:12,respawn:0}, 'power-strike'],
]) {
  for (let floor = 1; floor <= 4; floor++) {
    const s = new CombatSimulation(41); s.unlockedFloor = 4; s.bossDefeated = floor === 4; s.setFloor(floor); s.setProgression(false);
    s.levels = levels; s.setAbility(ability); s.hero.maxHp = s.hero.hp = s.stats.maxHp;
    let walking = 0, fighting = 0, recovery = 0, firstClear = null, deaths = 0;
    for (let i = 0; i < 600 * 60; i++) {
      if (s.hero.hp <= 0) recovery++; else if (s.inCombat) fighting++; else if (s.hero.state === 'walk') walking++;
      s.step(1/60); const events = s.drainEvents(); deaths += events.filter(e => e.type === 'death' && e.target === 1).length;
      if (firstClear === null && s.completedRuns) firstClear = Number(s.elapsed.toFixed(1));
    }
    results.push({build:name,floor,ability,gold:s.gold,goldPerMinute:Number((s.gold/10).toFixed(2)),runs:s.completedRuns,firstClearSeconds:firstClear,
      travelPercent:Number((walking/360).toFixed(1)),combatPercent:Number((fighting/360).toFixed(1)),recoveryPercent:Number((recovery/360).toFixed(1)),deaths,
      endedOnFloor:s.floor,navigationRecoveries:s.navigationRecoveries});
  }
}
writeFileSync(new URL('../docs/dungeon-balance-results.json',import.meta.url),JSON.stringify({secondsPerScenario:600,results},null,2)+'\n');
console.table(results);
