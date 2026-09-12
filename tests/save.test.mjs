import test from 'node:test';
import assert from 'node:assert/strict';
import { CombatSimulation } from '../src/game/simulation.ts';
import { parseSave, SaveStore, SAVE_KEY } from '../src/game/save.ts';

function memoryStorage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('Save roundtrip retains progression, injured HP, both cooldowns, and ability', () => {
  const sim = new CombatSimulation(); sim.gold = 100;
  sim.buyUpgrade('hp'); sim.buyUpgrade('atk'); sim.setAbility('heal');
  sim.hero.hp = 90; sim.cooldowns = { heal: 8, 'power-strike': 3 };
  const original = sim.exportSave();
  const restored = new CombatSimulation(); restored.restore(parseSave(JSON.stringify(original)));
  assert.deepEqual(restored.exportSave(), original);
  assert.equal(restored.hero.maxHp, 256);
  assert.equal(restored.elapsed, 0);
  assert.equal(restored.actors.length, 6);
});

test('Reload during death retains countdown with no offline advancement', () => {
  const sim = new CombatSimulation(); sim.hero.hp = 0; sim.hero.state = 'dead'; sim.respawnIn = 3.5;
  const data = sim.exportSave();
  const restored = new CombatSimulation(); restored.restore(parseSave(JSON.stringify(data)));
  assert.equal(restored.hero.state, 'dead'); assert.equal(restored.respawnIn, 3.5);
  for (let i = 0; i < 60; i++) { restored.step(1 / 60); restored.drainEvents(); }
  assert.equal(restored.hero.hp, 0); assert.ok(Math.abs(restored.respawnIn - 2.5) < 1e-8);
});

test('Missing saves start normally; invalid and future saves stay preserved and cannot be overwritten', () => {
  const storage = memoryStorage();
  assert.equal(new SaveStore(() => storage).load(), undefined);
  for (const raw of ['{broken', '{"version":2}', 'null', '[]']) {
    storage.setItem(SAVE_KEY, raw);
    const store = new SaveStore(() => storage);
    assert.equal(store.load(), undefined); assert.equal(store.blocked, true);
    assert.equal(store.write(new CombatSimulation().exportSave()), false);
    assert.equal(storage.getItem(SAVE_KEY), raw);
  }
});

test('Save validation rejects malformed numbers, levels, abilities and contradictory life state', () => {
  for (const mutate of [
    s => s.gold = -1, s => s.gold = 1.2, s => s.gold = 1e15,
    s => s.levels.atk = 101, s => s.levels.hp = .5, s => delete s.levels.def,
    s => s.ability = 'fireball', s => s.heroHp = 225, s => s.heroHp = null,
    s => s.respawnIn = 3, s => s.heroHp = 0,
    s => s.cooldowns.heal = 11, s => s.cooldowns['power-strike'] = -1,
  ]) {
    const data = new CombatSimulation().exportSave(); mutate(data);
    assert.throws(() => parseSave(JSON.stringify(data)));
  }
});

test('Storage access/write failures are visible and do not interrupt the session', () => {
  const denied = new SaveStore(() => { throw new Error('denied'); });
  assert.equal(denied.load(), undefined);
  assert.ok(denied.message); assert.equal(denied.write(new CombatSimulation().exportSave()), false);
  const store = new SaveStore(() => ({ getItem: () => null, setItem: () => { throw new Error('quota'); } }));
  assert.equal(store.write(new CombatSimulation().exportSave()), false); assert.ok(store.message);
});

test('Explicit start over replaces a blocked save, and the fresh state survives reload', () => {
  const storage = memoryStorage(); storage.setItem(SAVE_KEY, '{bad');
  const store = new SaveStore(() => storage); store.load();
  const sim = new CombatSimulation();
  assert.equal(store.replace(sim.exportSave()), true);
  assert.equal(store.blocked, false); assert.equal(store.message, '');
  assert.deepEqual(new SaveStore(() => storage).load(), sim.exportSave());
});
