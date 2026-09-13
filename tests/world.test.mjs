import test from 'node:test';
import assert from 'node:assert/strict';
import { CombatSimulation } from '../src/game/simulation.ts';
import { parseSave } from '../src/game/save.ts';
import { BOSS } from '../src/game/world.ts';
import { actorTexture, actorOpacity } from '../src/game/animation.ts';

const advance = (sim, seconds) => { const events = []; for (let i = 0; i < seconds * 60; i++) { sim.step(1 / 60); events.push(...sim.drainEvents()); } return events; };

test('Floor travel preserves injury, cooldowns, currency and upgrades; region follows location', () => {
  const sim = new CombatSimulation(); sim.gold = 100; sim.buyUpgrade('atk');
  sim.hero.hp = 70; sim.cooldowns.heal = 5;
  const gold = sim.gold;
  for (const floor of [2, 3, 1]) {
    assert.equal(sim.setFloor(floor).ok, true); assert.equal(sim.region, 'dungeon');
    assert.equal(sim.hero.hp, 70); assert.equal(sim.cooldowns.heal, 5); assert.equal(sim.gold, gold); assert.equal(sim.levels.atk, 1);
  }
  assert.equal(sim.setFloor(4).ok, false);
  sim.bossDefeated = true;
  assert.equal(sim.region, 'dungeon'); sim.setFloor(4); assert.equal(sim.region, 'crypt');
  sim.setFloor(3); assert.equal(sim.region, 'dungeon');
});

test('A new boss attempt starts clean and prevents changing the build or escaping to another floor', () => {
  const sim = new CombatSimulation(); sim.setFloor(3); sim.hero.hp = 12; sim.gold = 100;
  sim.startBoss();
  assert.equal(sim.hero.hp, sim.hero.maxHp); assert.equal(sim.actors.length, 2);
  assert.equal(sim.actors[1].hp, BOSS.hp); assert.equal(sim.region, 'dungeon');
  assert.equal(sim.buyUpgrade('atk').ok, false); assert.equal(sim.setFloor(1).ok, false);
  sim.setAbility('heal'); assert.equal(sim.ability, 'power-strike');
  sim.actors[1].hp = 100; sim.leaveBoss();
  assert.equal(sim.mode, 'farming'); assert.equal(sim.floor, 3); assert.equal(sim.hero.hp, 0);
  advance(sim, sim.stats.respawn + .1); sim.startBoss(); assert.equal(sim.actors[1].hp, BOSS.hp);
});

test('Death and timeout end an attempt, keep gold and return to the previous farming floor', () => {
  for (const end of ['death', 'timeout']) {
    const sim = new CombatSimulation(); sim.gold = 21; sim.setFloor(2); sim.startBoss();
    if (end === 'death') { sim.hero.hp = 1; advance(sim, 8); }
    else { sim.bossSeconds = .01; advance(sim, .02); }
    assert.equal(sim.mode, 'farming'); assert.equal(sim.floor, 2); assert.equal(sim.bossResult, 'defeat');
    assert.equal(sim.gold, 21); assert.equal(sim.bossDefeated, false);
  }
});

test('Victory unlocks two automatic abilities and the crypt once, without changing the room immediately', () => {
  const sim = new CombatSimulation(); sim.gold = 100000;
  for (let n = 0; n < 12; n++) { sim.buyUpgrade('atk'); sim.buyUpgrade('hp'); sim.buyUpgrade('def'); }
  sim.startBoss(); advance(sim, 80);
  assert.equal(sim.mode, 'victory'); assert.equal(sim.bossDefeated, true); assert.equal(sim.region, 'dungeon');
  assert.equal(sim.actors[1].hp, 0);
  sim.setFloor(4); assert.equal(sim.region, 'crypt');
  sim.hero.hp = sim.hero.maxHp / 2;
  const events = advance(sim, 15);
  assert.ok(events.some(e => e.type === 'heal'));
  assert.ok(events.some(e => e.type === 'hit' && e.source === sim.hero.id && e.power));
  assert.equal(sim.startBoss().ok, false);
});

test('Boss attack damage lands once at the contact frame after its telegraph', () => {
  const sim = new CombatSimulation(); sim.startBoss();
  const boss = sim.actors[1]; boss.x = sim.hero.x + 35; boss.y = sim.hero.y;
  boss.state = 'attack'; boss.stateTime = 0; boss.hitDelivered = false; boss.attackTarget = sim.hero.id; boss.attackWait = 10;
  const hp = sim.hero.hp;
  const events = advance(sim, .5); assert.equal(sim.hero.hp, hp);
  assert.equal(actorTexture(boss), 'boss-15');
  events.push(...advance(sim, .06)); assert.equal(actorTexture(boss), 'boss-16');
  events.push(...advance(sim, .3));
  assert.equal(events.filter(e => e.type === 'hit' && e.source === boss.id).length, 1);
  assert.ok(sim.hero.hp < hp);
});

test('Death clips retain the final pose before fading, and a hurt flash cannot interrupt an attack', () => {
  const sim = new CombatSimulation(); const hero = sim.hero;
  hero.state = 'attack'; hero.stateTime = .13; hero.flash = .08;
  assert.equal(actorTexture(hero), 'hero-10');
  hero.state = 'dead'; hero.stateTime = .5;
  assert.equal(actorTexture(hero), 'hero-extra-5'); assert.equal(actorOpacity(hero), 1);
  hero.stateTime = .75; assert.ok(actorOpacity(hero) < 1e-12);
});

test('Saves migrate version one; boss reloads retreat; world rewards survive reload', () => {
  const sim = new CombatSimulation(); sim.gold = 29;
  const legacy = sim.exportSave(); legacy.version = 1; delete legacy.floor; delete legacy.bossDefeated;
  const migrated = parseSave(JSON.stringify(legacy)); assert.equal(migrated.version, 2); assert.equal(migrated.gold, 29); assert.equal(migrated.floor, 1);
  sim.startBoss(); sim.actors[1].hp = 2;
  const restored = new CombatSimulation(); restored.restore(parseSave(JSON.stringify(sim.exportSave())));
  assert.equal(restored.mode, 'farming'); assert.equal(restored.hero.hp, 0); assert.ok(restored.respawnIn > 0); assert.equal(restored.bossDefeated, false);
  sim.bossDefeated = true; sim.mode = 'victory'; sim.setFloor(4);
  restored.restore(parseSave(JSON.stringify(sim.exportSave())));
  assert.equal(restored.floor, 4); assert.equal(restored.region, 'crypt'); assert.equal(restored.bossDefeated, true);
  for (const mutate of [s => s.floor = 0, s => s.floor = 2.5, s => s.floor = 5, s => s.bossDefeated = 'true', s => { s.floor = 4; s.bossDefeated = false; }, s => s.version = 3]) {
    const data = sim.exportSave(); mutate(data); assert.throws(() => parseSave(JSON.stringify(data)));
  }
});

test('Measured gold rate uses floor rewards and includes respawn downtime', () => {
  const sim = new CombatSimulation(); sim.setFloor(3);
  const enemy = sim.actors[1]; enemy.hp = 1; enemy.x = sim.hero.x + 22; enemy.y = sim.hero.y;
  advance(sim, 1); assert.equal(sim.gold, 4); const rate = sim.goldPerMinute;
  sim.hero.hp = 0; sim.hero.state = 'dead'; sim.respawnIn = 5;
  advance(sim, 3); assert.equal(sim.gold, 4); assert.ok(sim.goldPerMinute < rate);
});
