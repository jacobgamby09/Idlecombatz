import test from 'node:test';
import assert from 'node:assert/strict';
import { CombatSimulation, DEMO } from '../src/game/simulation.ts';

const advance = (simulation, seconds) => {
  const events = [];
  for (let tick = 0; tick < Math.ceil(seconds * 60); tick++) {
    simulation.step(1 / 60);
    events.push(...simulation.drainEvents());
  }
  return events;
};

test('Heal waits for useful missing HP, restores 20%, and swapping preserves cooldown', () => {
  const sim = new CombatSimulation();
  sim.setAbility('heal');
  sim.actors = [sim.hero];
  assert.equal(advance(sim, 0.1).some(e => e.type === 'heal'), false);
  sim.hero.hp = 120;
  const events = advance(sim, 1 / 60);
  assert.equal(events.filter(e => e.type === 'heal').length, 1);
  assert.equal(sim.hero.hp, 120 + DEMO.heroHp * 0.2);
  sim.setAbility('power-strike');
  sim.setAbility('heal');
  assert.equal(sim.cooldowns.heal, 10);
  assert.equal(advance(sim, 0.1).some(e => e.type === 'heal'), false);
});

test('One kill produces one reward, and the fixed-tick study stays bounded', () => {
  const sim = new CombatSimulation();
  const events = advance(sim, 90);
  const deaths = events.filter(event => event.type === 'death' && event.target !== 1);
  // Hero ids can change on a respawn; for this sustain-free study the counter and death events agree before first hero death.
  assert.ok(sim.gold > 0);
  assert.ok(deaths.length >= sim.gold);
  const sim2 = new CombatSimulation();
  const early = advance(sim2, 15);
  assert.equal(sim2.gold, early.filter(event => event.type === 'death').length);
  for (const actor of sim.actors) {
    assert.ok(actor.hp >= 0 && actor.hp <= actor.maxHp);
    assert.ok(Number.isFinite(actor.x) && Number.isFinite(actor.y));
  }
  assert.ok(sim.actors.length <= 6);
});

test('Reset recreates the same encounter and clears transient progression', () => {
  const sim = new CombatSimulation();
  const initial = JSON.stringify(sim.actors);
  const events = advance(sim, 18);
  assert.ok(events.some(event => event.type === 'hit' && event.power));
  sim.reset();
  assert.equal(JSON.stringify(sim.actors), initial);
  assert.equal(sim.gold, 0);
  assert.equal(sim.elapsed, 0);
  assert.deepEqual(sim.events, []);
});

test('A dead hero stops combat and respawns into fresh enemies', () => {
  const sim = new CombatSimulation();
  sim.hero.hp = 0;
  sim.hero.state = 'dead';
  sim.respawnIn = DEMO.respawnSeconds;
  const during = advance(sim, 2);
  assert.equal(during.filter(event => event.type === 'hit').length, 0);
  assert.equal(sim.hero.hp, 0);
  const after = advance(sim, 3.1);
  assert.ok(after.some(event => event.type === 'respawn'));
  assert.equal(sim.hero.hp, DEMO.heroHp);
  assert.equal(sim.actors.length, 6);
});

test('Both combatants can attack at a boundary with floating-point rounding', () => {
  const sim = new CombatSimulation();
  const enemy = sim.actors[1];
  enemy.x = sim.hero.x + DEMO.attackRange + 1e-12;
  enemy.y = sim.hero.y;
  sim.hero.attackWait = enemy.attackWait = 0;
  sim.step(1 / 60);
  assert.equal(sim.hero.state, 'attack');
  assert.equal(enemy.state, 'attack');
  const hits = advance(sim, DEMO.hitTime + 1 / 60).filter(e => e.type === 'hit');
  assert.ok(hits.some(e => e.source === sim.hero.id && e.target === enemy.id));
  assert.ok(hits.some(e => e.source === enemy.id && e.target === sim.hero.id));
});

for (const ability of ['power-strike', 'heal']) {
  test(`Crowded combat does not stall a ready hero at melee range (${ability})`, () => {
    const sim = new CombatSimulation();
    sim.setAbility(ability);
    let waiting = 0;
    for (let tick = 0; tick < 180 * 60; tick++) {
      sim.step(1 / 60);
      sim.drainEvents();
      const hero = sim.hero;
      const nearest = Math.min(...sim.actors
        .filter(a => a.kind === 'skeleton' && a.hp > 0)
        .map(a => Math.hypot(a.x - hero.x, a.y - hero.y)));
      waiting = hero.hp > 0 && hero.attackWait === 0 && hero.state !== 'attack'
        && nearest <= DEMO.attackRange + 0.1 ? waiting + 1 : 0;
      assert.ok(waiting <= 15, `Ready hero stalled near a mob at ${sim.elapsed.toFixed(2)}s`);
    }
  });
}
