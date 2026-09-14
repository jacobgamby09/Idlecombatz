import test from 'node:test';
import assert from 'node:assert/strict';
import { CombatSimulation } from '../src/game/simulation.ts';
import { parseSave } from '../src/game/save.ts';
import { dungeonFor, center, fits, cell, point } from '../src/game/dungeon/layouts.ts';
import { route, reveal, sight, neighbors } from '../src/game/dungeon/navigation.ts';
const tick = s => { s.step(1 / 60); return s.drainEvents(); };
const advance = (s, seconds) => { for (let i = 0; i < seconds * 60; i++) tick(s); };
function powerful(floor = 1) {
  const s = new CombatSimulation(); s.bossDefeated = true; s.unlockedFloor = 4; s.setFloor(floor); s.setProgression(false);
  s.levels = { atk: 20, hp: 20, def: 20, respawn: 0 }; s.hero.maxHp = s.hero.hp = s.stats.maxHp; return s;
}
test('Every hand-built dungeon connects all rooms and interactions to its entrance', () => {
  for (let floor = 1; floor <= 4; floor++) {
    const d = dungeonFor(floor); assert.equal(d.rooms.length, 7);
    for (const target of [d.exit, ...d.rooms.map(center), ...d.chests]) {
      const path = route(d, d.entry, target); assert.ok(path.length > 0);
      for (const p of path) assert.ok(fits(d, p));
    }
    assert.deepEqual(route(d, d.entry, { x: 0, y: 0 }), []);
  }
});
test('Visibility exposes the first wall but does not expose the room beyond it', () => {
  const d = dungeonFor(1), explored = Array(d.tiles.length).fill(0), visible = reveal(d, d.entry, explored);
  assert.ok(visible.has(cell(d, d.entry))); assert.ok([...visible].some(i => d.tiles[i] === 0));
  assert.equal(visible.has(cell(d, center(d.rooms[5]))), false);
  assert.equal(sight(d, d.entry, center(d.rooms[5])), false);
});
test('Orders reject unknown walls, can be replaced, and return to Auto on arrival', () => {
  const s = new CombatSimulation(); const p = { x: s.hero.x + 32, y: s.hero.y };
  assert.equal(s.command({ kind: 'move', x: 0, y: 0 }).ok, false);
  assert.equal(s.command({ kind: 'move', ...center(s.dungeon.rooms[5]) }).ok, false);
  assert.equal(s.command({ kind: 'move', ...p }).ok, true); advance(s, .4);
  assert.equal(s.command({ kind: 'move', x: s.dungeon.entry.x, y: s.dungeon.entry.y }).ok, true);
  advance(s, 2); assert.equal(s.order, null); assert.equal(s.navigationRecoveries, 0);
  s.command({ kind: 'move', ...p }); s.auto(); assert.equal(s.order, null);
});
test('Every floor repeats at least twenty times without route recovery, invalid positions or extra rewards', () => {
  for (let floor = 1; floor <= 4; floor++) {
    const s = powerful(floor); let kills = 0, lastRun = s.runId, expected = 0;
    for (let i = 0; i < 240000 && s.completedRuns < 20; i++) {
      const goldBefore = s.gold, chestsBefore = s.chests.filter(c => c.opened).length, completeBefore = s.completed;
      const events = tick(s); kills += events.filter(e => e.type === 'death' && e.target !== 1).length;
      const reward = floor === 1 ? 1 : floor === 2 ? 2 : floor === 3 ? 4 : 6;
      const deaths = events.filter(e => e.type === 'death' && e.target !== 1);
      expected += deaths.reduce((sum, e) => sum + reward * (s.actors.find(a => a.id === e.target)?.kind === 'boss' ? 8 : 1), 0);
      if (s.runId === lastRun) expected += (s.chests.filter(c => c.opened).length - chestsBefore) * reward + (!completeBefore && s.completed ? reward : 0);
      lastRun = s.runId;
      assert.equal(s.gold, expected, `reward ledger on floor ${floor}`); assert.ok(s.gold >= goldBefore);
      if (i % 60 === 0) { for (const a of s.actors) assert.ok(fits(s.dungeon, a, a.kind === 'boss' ? 12 : 5)); parseSave(JSON.stringify(s.exportSave())); }
    }
    assert.equal(s.completedRuns, 20, `floor ${floor}`); assert.equal(s.floor, floor); assert.equal(s.navigationRecoveries, 0); assert.ok(kills > 0);
  }
});
test('Save roundtrips during actual travel, attack, loot and clear preserve encounter state', () => {
  const s = powerful(); const seen = new Set();
  for (let i = 0; i < 12000 && seen.size < 4; i++) {
    tick(s);
    const kind = s.completed ? 'clear' : s.chests.some(c => c.opened) ? 'loot' : s.hero.state === 'attack' ? 'attack' : 'travel';
    if (seen.has(kind)) continue;
    const data = parseSave(JSON.stringify(s.exportSave())), restored = new CombatSimulation(); restored.restore(data);
    assert.deepEqual(restored.exportSave(), data, kind);
    if (kind === 'attack') {
      const target = restored.actors.find(a => a.id === restored.hero.attackTarget), hp = target.hp;
      const hits = []; for (let j = 0; j < 20; j++) hits.push(...tick(restored));
      assert.ok(hits.filter(e => e.type === 'hit' && e.source === 1).length <= 1); assert.ok(target.hp <= hp);
    }
    seen.add(kind);
  }
  assert.equal(seen.size, 4);
});
test('Chest order persists, opens once, and an opened chest cannot be targeted again', () => {
  const s = powerful(), c = s.chests[0];
  s.hero.x = c.x - 32; s.hero.y = c.y; s.step(.001); s.drainEvents();
  assert.equal(s.command({ kind: 'chest', id: c.id }).ok, true);
  const r = new CombatSimulation(); r.restore(parseSave(JSON.stringify(s.exportSave())));
  advance(r, 2); assert.equal(r.chests[0].opened, true); assert.equal(r.gold, 1); assert.equal(r.order, null);
  assert.equal(r.command({ kind: 'chest', id: 0 }).ok, false);
  const again = new CombatSimulation(); again.restore(parseSave(JSON.stringify(r.exportSave()))); assert.equal(again.chests[0].opened, true); assert.equal(again.gold, 1);
});
test('Malformed v3 entity identities, positions, rewards and transitions are rejected', () => {
  for (const mutate of [s => s.run.actors[1].id = 1, s => s.run.actors[0].x = 0, s => s.run.actors[0].hp = 0,
    s => s.run.chests[0].x = 0, s => s.run.explored = [], s => s.run.completed = true, s => s.run.mode = 'boss',
    s => s.unlockedFloor = 4, s => s.run.actors[1].attackTarget = 999, s => s.version = 9]) {
    const data = new CombatSimulation().exportSave(); mutate(data); assert.throws(() => parseSave(JSON.stringify(data)));
  }
});
test('Layout revision migration preserves progression and injury but restarts the layout', () => {
  const s = new CombatSimulation(); s.gold = 87; s.hero.hp = 77;
  const data = s.exportSave(); data.run.revision = 0 + 2;
  const restored = new CombatSimulation(); restored.restore(parseSave(JSON.stringify(data)));
  assert.equal(restored.gold, 87); assert.equal(restored.hero.hp, 77); assert.deepEqual({x:restored.hero.x,y:restored.hero.y}, restored.dungeon.entry); assert.match(restored.notice, /updated/);
});
test('A hit cannot reach through a wall even when target and attack timers remain valid', () => {
  const s = new CombatSimulation(), a = s.actors[1];
  // Both are in melee range on walkable ground, but a wall corner blocks the diagonal.
  s.hero.x = 216; s.hero.y = 680;
  a.x = 232; a.y = 664; a.homeX = a.x; a.homeY = a.y;
  assert.ok(fits(s.dungeon, s.hero) && fits(s.dungeon, a));
  assert.ok(Math.hypot(a.x-s.hero.x,a.y-s.hero.y) < 23);
  assert.equal(sight(s.dungeon, s.hero, a), false);
  s.hero.state = 'attack'; s.hero.stateTime = .11; s.hero.attackTarget = a.id; s.hero.attackDamage = 999; s.hero.hitDelivered = false;
  const hp = a.hp; tick(s); assert.equal(a.hp, hp);
});

test('Auto recovers from repeated player interruptions across layouts and spawn seeds', () => {
  for (let floor = 1; floor <= 4; floor++) for (const seed of [7, 41, 123]) {
    const s = powerful(floor); s.randomState = seed;
    for (let i = 0; i < 120 * 60; i++) {
      if (i % 137 === 0) {
        const choices = neighbors(s.dungeon, cell(s.dungeon, s.hero)).filter(n => s.explored[n]);
        if (choices.length) s.command({kind:'move', ...point(s.dungeon, choices[(i + seed) % choices.length])});
      }
      tick(s);
    }
    s.auto(); advance(s, 180); assert.ok(s.completedRuns > 0); assert.equal(s.navigationRecoveries, 0);
    for (const a of s.actors) assert.ok(fits(s.dungeon, a, a.kind === 'boss' ? 12 : 5));
  }
});
