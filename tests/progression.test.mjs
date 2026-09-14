import test from 'node:test';
import assert from 'node:assert/strict';
import { CombatSimulation, DEMO } from '../src/game/simulation.ts';
import { freshLevels, heroStats, upgradePrice, UPGRADES } from '../src/game/progression.ts';

const advance = (sim, seconds) => {
  const events = [];
  for (let i = 0; i < Math.ceil(seconds * 60); i++) { sim.step(1 / 60); events.push(...sim.drainEvents()); }
  return events;
};

test('Purchases charge the current price atomically and reject invalid or unaffordable requests', () => {
  const sim = new CombatSimulation();
  const initial = sim.exportSave();
  assert.equal(sim.buyUpgrade('atk').ok, false);
  assert.equal(sim.buyUpgrade('__proto__').ok, false);
  assert.deepEqual(sim.exportSave(), initial);
  sim.gold = upgradePrice('atk', 0) + upgradePrice('atk', 1);
  for (let i = 0; i < 20; i++) sim.buyUpgrade('atk');
  assert.equal(sim.levels.atk, 2);
  assert.equal(sim.gold, 0);
  assert.equal(sim.stats.atk, 32);
  assert.equal(sim.upgrades.find(u => u.id === 'atk').price, upgradePrice('atk', 2));
});

test('Prices and stat progression remain finite and capped recovery stops at two seconds', () => {
  const sim = new CombatSimulation(); sim.gold = 1e12;
  for (const [id, definition] of Object.entries(UPGRADES)) {
    let previous = 0;
    for (let level = 0; level < definition.cap; level++) {
      const price = upgradePrice(id, level);
      assert.ok(Number.isSafeInteger(price) && price >= previous); previous = price;
      assert.equal(sim.buyUpgrade(id).ok, true);
    }
    const before = sim.exportSave();
    assert.equal(sim.buyUpgrade(id).ok, false);
    assert.deepEqual(sim.exportSave(), before);
    assert.equal(upgradePrice(id, definition.cap), null);
  }
  assert.equal(sim.stats.respawn, 2);
});

test('An attack in flight retains its damage; the next attack uses the purchased ATK', () => {
  const sim = new CombatSimulation(); sim.gold = 100; sim.setAbility('heal');
  sim.actors[1].x = sim.hero.x + 22.9; sim.actors[1].y = sim.hero.y;
  sim.actors[1].homeX = sim.actors[1].x; sim.actors[1].homeY = sim.actors[1].y;
  sim.actors[1].hp = sim.actors[1].maxHp = 1000;
  sim.hero.attackWait = 0; sim.step(1 / 60); sim.drainEvents();
  assert.equal(sim.hero.state, 'attack');
  sim.buyUpgrade('atk');
  const hits = advance(sim, 1.4).filter(e => e.type === 'hit' && e.source === sim.hero.id);
  assert.deepEqual(hits.slice(0, 2).map(e => e.amount), [24, 28]);
});

test('HP purchases do not heal, while subsequent Heal and respawn use the upgraded maximum', () => {
  const sim = new CombatSimulation(); sim.gold = 100; sim.hero.hp = 100;
  sim.buyUpgrade('hp');
  assert.equal(sim.hero.hp, 100); assert.equal(sim.hero.maxHp, 256);
  sim.setAbility('heal');
  const healing = advance(sim, 1 / 60).find(e => e.type === 'heal');
  assert.equal(healing.amount, 51.2);
  sim.hero.hp = 0; sim.hero.state = 'dead'; sim.respawnIn = 5;
  sim.buyUpgrade('hp'); sim.buyUpgrade('respawn');
  assert.equal(sim.hero.hp, 0); assert.equal(sim.respawnIn, 5);
  advance(sim, 5.05);
  assert.equal(sim.hero.hp, 288); assert.equal(sim.hero.maxHp, 288);
  assert.equal(sim.stats.respawn, 4.8);
});

test('Defense reduces actual incoming hits using the displayed formula', () => {
  const sim = new CombatSimulation(); sim.gold = 100; sim.buyUpgrade('def');
  const enemy = sim.actors[1]; enemy.x = sim.hero.x + 22.9; enemy.y = sim.hero.y; enemy.attackWait = 0; enemy.homeX = enemy.x; enemy.homeY = enemy.y;
  const hit = advance(sim, .2).find(e => e.type === 'hit' && e.source === enemy.id);
  assert.equal(hit.amount, DEMO.enemyAtk * 100 / (100 + sim.stats.def));
  assert.deepEqual(heroStats(freshLevels()), { atk: 24, maxHp: 224, def: 12, respawn: 5 });
});

test('A new death uses upgraded recovery; reset clears progression', () => {
  const sim = new CombatSimulation(); sim.gold = 100; sim.buyUpgrade('respawn');
  sim.hero.hp = 1;
  const enemy = sim.actors[1]; enemy.x = sim.hero.x + 22.9; enemy.y = sim.hero.y; enemy.attackWait = 0; enemy.homeX = enemy.x; enemy.homeY = enemy.y;
  for (let i = 0; i < 30 && sim.hero.hp > 0; i++) { sim.step(1 / 60); sim.drainEvents(); }
  assert.equal(sim.respawnIn, 4.8);
  sim.reset();
  assert.equal(sim.gold, 0); assert.deepEqual(sim.levels, freshLevels());
  assert.equal(sim.hero.hp, 224);
});
