import test from 'node:test';
import assert from 'node:assert/strict';
import { CombatSimulation } from '../src/game/simulation.ts';
import { parseSave, SaveStore, SAVE_KEY, BACKUP_KEY } from '../src/game/save.ts';
import { BOSS } from '../src/game/world.ts';
import { actorTexture, actorOpacity } from '../src/game/animation.ts';
const advance = (sim, seconds) => { const events = []; for (let i = 0; i < Math.ceil(seconds * 60); i++) { sim.step(1 / 60); events.push(...sim.drainEvents()); } return events; };
const strong = s => { s.levels = { atk: 12, hp: 12, def: 12, respawn: 0 }; s.hero.hp = s.hero.maxHp = s.stats.maxHp; };
function bossFixture() {
  const s = new CombatSimulation(); s.unlockedFloor = 3; s.setFloor(3);
  for (const a of s.actors) if (a.kind === 'skeleton') { a.hp = 0; a.state = 'dead'; }
  s.chests.forEach(c => c.opened = true);
  s.explored.fill(1);
  const b = s.actors.find(a => a.kind === 'boss'); s.hero.x = b.x; s.hero.y = b.y + 35; s.hero.hp = 12;
  s.step(1 / 60); s.drainEvents(); return { s, b };
}
test('New games unlock sequentially; unlocked floor travel preserves injury and cooldowns', () => {
  const s = new CombatSimulation(); assert.equal(s.setFloor(2).ok, false);
  strong(s); for (let i = 0; i < 18000 && s.floor === 1; i++) { s.step(1 / 60); s.drainEvents(); }
  assert.equal(s.floor, 2); assert.equal(s.unlockedFloor, 2); assert.deepEqual(s.clearedFloors, [1]);
  s.hero.hp = 70; s.cooldowns.heal = 5; const gold = s.gold;
  assert.equal(s.setFloor(1).ok, true); assert.equal(s.hero.hp, 70); assert.equal(s.cooldowns.heal, 5); assert.equal(s.gold, gold);
  assert.equal(s.setFloor(4).ok, false);
});
test('Boss starts in his cleared floor only, at full health, and locks build changes', () => {
  assert.equal(new CombatSimulation().startBoss().ok, false);
  const { s, b } = bossFixture(); assert.equal(s.mode, 'boss'); assert.equal(s.hero.hp, s.hero.maxHp); assert.equal(b.hp, BOSS.hp);
  s.gold = 100; assert.equal(s.buyUpgrade('atk').ok, false); assert.equal(s.setFloor(1).ok, false);
  s.setAbility('heal'); assert.equal(s.ability, 'power-strike');
  s.leaveBoss(); assert.equal(s.hero.hp, 0); assert.equal(s.bossResult, 'defeat'); assert.equal(s.failures, 1);
  advance(s, s.respawnIn + .05); assert.equal(s.mode, 'farming'); assert.equal(s.roomsCleared, 0); assert.equal(s.startBoss().ok, false);
});
test('Boss timeout and reload end the attempt without preserving damage or duplicating progression', () => {
  for (const end of ['timeout', 'reload']) {
    const { s, b } = bossFixture(); s.gold = 29; b.hp = 2;
    let result = s;
    if (end === 'timeout') { s.bossSeconds = .01; advance(s, .02); }
    else { result = new CombatSimulation(); result.restore(parseSave(JSON.stringify(s.exportSave()))); }
    assert.equal(result.mode, 'farming'); assert.equal(result.hero.hp, 0); assert.equal(result.bossDefeated, false);
    assert.equal(result.gold, 29); assert.equal(result.failures, 1); assert.ok(result.respawnIn > 0);
    advance(result, result.respawnIn + .05); assert.equal(result.actors.find(a => a.kind === 'boss').hp, BOSS.hp);
  }
});
test('Victory unlocks both abilities and crypt once, then Auto continues to stairs', () => {
  const { s } = bossFixture(); strong(s);
  for (let i = 0; i < 5400 && s.mode !== 'victory'; i++) { s.step(1 / 60); s.drainEvents(); }
  assert.equal(s.mode, 'victory'); assert.equal(s.bossDefeated, true); assert.equal(s.unlockedFloor, 4); assert.equal(s.region, 'dungeon');
  s.hero.hp = s.hero.maxHp / 2;
  const events = advance(s, 35); assert.equal(s.floor, 4); assert.equal(s.region, 'crypt');
  assert.ok(events.some(e => e.type === 'heal')); assert.ok(events.some(e => e.type === 'hit' && e.power));
});
test('Boss contact timing still delivers exactly one hit and death/hurt clips remain coherent', () => {
  const { s, b } = bossFixture(); b.state = 'attack'; b.stateTime = 0; b.hitDelivered = false; b.attackTarget = s.hero.id; b.attackWait = 10;
  const hp = s.hero.hp; const events = advance(s, .5); assert.equal(s.hero.hp, hp); assert.equal(actorTexture(b), 'boss-15');
  events.push(...advance(s, .06)); assert.equal(actorTexture(b), 'boss-16'); events.push(...advance(s, .3));
  assert.equal(events.filter(e => e.type === 'hit' && e.source === b.id).length, 1);
  const h = s.hero; h.state = 'attack'; h.stateTime = .13; h.flash = .08; assert.equal(actorTexture(h), 'hero-10');
  h.state = 'dead'; h.stateTime = .5; assert.equal(actorTexture(h), 'hero-extra-5'); assert.equal(actorOpacity(h), 1);
  h.stateTime = .75; assert.ok(actorOpacity(h) < 1e-12);
});
test('Two failed runs fall back to a cleared lower floor and keep farming without input', () => {
  const s = new CombatSimulation(); s.unlockedFloor = 3; s.clearedFloors = [1, 2]; s.setFloor(3); s.gold = 123;
  for (let i = 0; i < 2; i++) { s.leaveBoss(); advance(s, s.respawnIn + .05); }
  assert.equal(s.floor, 2); assert.equal(s.advanceFloors, false); assert.equal(s.gold, 123); assert.match(s.notice, /Farming Floor 2/);
  strong(s); advance(s, 250); assert.equal(s.floor, 2); assert.ok(s.completedRuns > 0); assert.ok(s.gold > 123); assert.equal(s.navigationRecoveries, 0);
});
test('Legacy v1 and v2 saves retain old access and are backed up before migration writes', () => {
  for (const version of [1, 2]) {
    const old = { version, floor: 3, bossDefeated: false, gold: 47, levels: { atk: 2, hp: 1, def: 3, respawn: 2 }, ability: 'heal', heroHp: 70, cooldowns: { heal: 5, 'power-strike': 3 }, respawnIn: 0 };
    if (version === 1) { delete old.floor; delete old.bossDefeated; }
    const raw = JSON.stringify(old), values = new Map([[SAVE_KEY, raw]]);
    const storage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
    const store = new SaveStore(() => storage), s = new CombatSimulation(); s.restore(store.load());
    assert.equal(s.unlockedFloor, 3); assert.equal(s.floor, version === 1 ? 1 : 3); assert.equal(s.gold, 47); assert.equal(s.hero.hp, 70); assert.equal(s.advanceFloors, false);
    store.write(s.exportSave()); assert.equal(values.get(BACKUP_KEY), raw); assert.equal(JSON.parse(values.get(SAVE_KEY)).version, 3);
  }
});
test('A failed legacy backup leaves original save bytes untouched', () => {
  const old = JSON.stringify({ version: 1, gold: 10, levels: { atk: 0, hp: 0, def: 0, respawn: 0 }, ability: 'heal', heroHp: 120, cooldowns: { heal: 5, 'power-strike': 0 }, respawnIn: 0 });
  const store = new SaveStore(() => ({ getItem: k => k === SAVE_KEY ? old : null, setItem: () => { throw Error('quota'); } }));
  const s = new CombatSimulation(); s.restore(store.load()); assert.equal(store.write(s.exportSave()), false); assert.match(store.message, /failed/);
});
test('Gold rate includes travel, fights and recovery time', () => {
  const s = new CombatSimulation(); advance(s, 25); assert.ok(s.gold > 0); const rate = s.goldPerMinute;
  s.leaveBoss(); advance(s, 3); assert.ok(s.goldPerMinute < rate);
});
