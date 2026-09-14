import { DEMO, MAX_GOLD } from './balance.ts';
import { freshLevels, heroStats, upgradePrice, upgradeViews, UPGRADE_IDS } from './progression.ts';
import type { Ability, PurchaseResult, SaveData, UpgradeId, HeroOrder, RunSave } from './types.ts';
import { BOSS, floorById, FLOORS } from './world.ts';
import { cell, center, dungeonFor, fits, point, walkable } from './dungeon/layouts.ts';
import type { Chest, Point } from './dungeon/layouts.ts';
import { neighbors, reveal, route, sight } from './dungeon/navigation.ts';
export type { Ability } from './types.ts';
export { DEMO } from './balance.ts';
export type ActorState = 'idle' | 'walk' | 'attack' | 'dead';
export interface Actor {
  id: number; kind: 'hero' | 'skeleton' | 'boss'; x: number; y: number; hp: number; maxHp: number;
  facing: number; state: ActorState; stateTime: number; attackWait: number; attackTarget: number;
  attackPower: boolean; attackDamage: number; hitDelivered: boolean; flash: number;
  flashKind: 'hit' | 'heal'; spawnTime: number; room: number; homeX: number; homeY: number; active: boolean;
}
export type CombatEvent =
  | { type: 'hit'; source: number; target: number; amount: number; power: boolean; angle: number }
  | { type: 'heal'; target: number; amount: number }
  | { type: 'death'; target: number; x: number; y: number }
  | { type: 'respawn' } | { type: 'save' };
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const ok: PurchaseResult = { ok: true };
const fail = (reason: string): PurchaseResult => ({ ok: false, reason });

/** Fixed-step game rules. Rendering, input surfaces and storage are adapters. */
export class CombatSimulation {
  actors: Actor[] = []; events: CombatEvent[] = []; elapsed = 0; gold = 0; levels = freshLevels();
  ability: Ability = 'power-strike'; cooldowns: Record<Ability, number> = { 'power-strike': .7, heal: 0 };
  respawnIn = 0; floor = 1; bossDefeated = false; mode: 'farming' | 'boss' | 'victory' = 'farming';
  bossSeconds = 0; bossResult: 'victory' | 'defeat' | null = null;
  unlockedFloor = 1; clearedFloors: number[] = []; advanceFloors = true; failures = 0; completedRuns = 0;
  runId = 0; chests: Chest[] = []; explored: number[] = []; visible = new Set<number>();
  order: HeroOrder | null = null; destination: Point | null = null; activity = 'Exploring'; notice = '';
  completed = false; transition = 0; navigationRecoveries = 0;
  private nextId = 1; private randomState = 41; private seed: number;
  private farmingTime = 0; private rewards: { time: number; amount: number }[] = [];
  private lastCell = -1; private visionPoint: Point = { x: 0, y: 0 }; private brainWait = 0; private stalled = 0; private lastPosition: Point = { x: 0, y: 0 };
  private paths = new Map<number, { key: string; steps: Point[] }>();
  constructor(seed = 41) { this.seed = seed; this.reset(); }
  get dungeon() { return dungeonFor(this.floor); }
  get hero(): Actor { return this.actors[0]; }
  get stats() { return heroStats(this.levels); }
  get upgrades() { return upgradeViews(this.levels, this.gold); }
  get region() { return floorById(this.floor).regionId; }
  get goldPerMinute() { return this.farmingTime ? this.rewards.reduce((s, r) => s + r.amount, 0) * 60 / Math.min(60, this.farmingTime) : 0; }
  get combatRooms() { return this.dungeon.rooms.filter(r => r.kind === 'combat' || r.kind === 'boss'); }
  get roomsCleared() { return this.combatRooms.filter(r => !this.actors.some(a => a.room === r.id && a.kind !== 'hero' && a.hp > 0)).length; }
  get readyToExit() { return this.roomsCleared === this.combatRooms.length && this.chests.every(c => c.opened); }
  get inCombat() { return this.actors.some(a => a.kind !== 'hero' && a.hp > 0 && a.active && distance(a, this.hero) < 100); }
  isVisible(p: Point) { return this.visible.has(cell(this.dungeon, p)); }
  roomKnown(id: number) { const r = this.dungeon.rooms[id]; return r && this.explored[cell(this.dungeon, center(r))] === 1; }
  private random() { this.randomState = (Math.imul(this.randomState, 1664525) + 1013904223) >>> 0; return this.randomState / 4294967296; }
  private actor(kind: Actor['kind'], p: Point, room: number): Actor {
    const maxHp = kind === 'hero' ? this.stats.maxHp : kind === 'boss' ? BOSS.hp : Math.round((68 + Math.floor(this.random() * 35)) * floorById(this.floor).hp);
    return { id: this.nextId++, kind, ...p, hp: maxHp, maxHp, facing: 1, state: 'idle', stateTime: 0,
      attackWait: kind === 'hero' ? .45 : 1 + this.random(), attackTarget: 0, attackPower: false,
      attackDamage: 0, hitDelivered: false, flash: 0, flashKind: 'hit', spawnTime: 0, room, homeX: p.x, homeY: p.y, active: false };
  }
  reset() {
    this.nextId = 1; this.randomState = this.seed; this.elapsed = 0; this.gold = 0; this.levels = freshLevels();
    this.ability = 'power-strike'; this.floor = 1; this.bossDefeated = false; this.unlockedFloor = 1;
    this.clearedFloors = []; this.advanceFloors = true; this.failures = 0; this.completedRuns = 0; this.runId = 0;
    this.notice = ''; this.navigationRecoveries = 0; this.farmingTime = 0; this.rewards = [];
    this.respawnIn = 0; this.cooldowns = { 'power-strike': .7, heal: 0 }; this.events = [];
    this.populate(false);
  }
  private populate(keepMap: boolean) {
    this.runId++; this.nextId = 1; this.mode = 'farming'; this.bossResult = null; this.bossSeconds = 0;
    this.actors = [this.actor('hero', this.dungeon.entry, 0)];
    for (const r of this.combatRooms) {
      const p = center(r);
      if (r.kind === 'boss') this.actors.push(this.actor('boss', { x: p.x, y: p.y - 24 }, r.id));
      else for (const [x, y] of [[-24, -16], [24, -12], [0, 24]]) this.actors.push(this.actor('skeleton', { x: p.x + x, y: p.y + y }, r.id));
    }
    this.chests = this.dungeon.chests.map(c => ({ ...c }));
    if (!keepMap) this.explored = Array<number>(this.dungeon.tiles.length).fill(0);
    this.completed = false; this.transition = 0; this.order = null; this.destination = null;
    this.activity = 'Exploring'; this.paths.clear(); this.lastCell = -1; this.brainWait = 0; this.stalled = 0;
    this.updateVision(); this.lastPosition = { x: this.hero.x, y: this.hero.y };
  }
  setFloor(id: number): PurchaseResult {
    if (!FLOORS.some(f => f.id === id) || id > this.unlockedFloor) return fail('Clear the previous floor to unlock this descent.');
    if (this.mode !== 'farming' || this.inCombat || this.respawnIn > 0 || this.transition > 0) return fail('Finish this encounter or retreat before travelling.');
    if (id === this.floor) return ok;
    const hp = this.hero.hp; this.floor = id; this.failures = 0; this.notice = '';
    this.populate(false); this.hero.hp = hp; this.events.push({ type: 'respawn' }, { type: 'save' }); return ok;
  }
  setProgression(advance: boolean) { this.advanceFloors = advance; this.failures = 0; this.notice = ''; this.events.push({ type: 'save' }); }
  auto() { this.order = null; this.destination = null; this.brainWait = 0; this.paths.delete(this.hero.id); }
  command(order: HeroOrder): PurchaseResult {
    if (this.hero.hp <= 0 || this.transition > 0 || this.mode === 'victory') return fail('Wait for your hero to return.');
    let p: Point | undefined;
    if (order.kind === 'move') p = order;
    if (order.kind === 'enemy') p = this.actors.find(a => a.id === order.id && a.kind !== 'hero' && a.hp > 0 && this.isVisible(a));
    if (order.kind === 'enemy' && this.actors.find(a => a.id === order.id)?.kind === 'boss' && !this.normalRoomsDone()) return fail('Clear the other rooms and collect their treasure before challenging the king.');
    if (order.kind === 'chest') p = this.chests.find(c => c.id === order.id && !c.opened && this.isVisible(c));
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || !walkable(this.dungeon, p.x, p.y) || !this.explored[cell(this.dungeon, p)] || !fits(this.dungeon, point(this.dungeon, cell(this.dungeon, p))) || !route(this.dungeon, this.hero, p, this.explored).length) return fail('Choose a reachable place in the explored dungeon.');
    this.order = { ...order }; this.destination = null; this.brainWait = 0; this.paths.delete(this.hero.id); return ok;
  }
  startBoss(): PurchaseResult {
    const boss = this.actors.find(a => a.kind === 'boss' && a.hp > 0);
    if (!boss || this.mode !== 'farming' || this.hero.hp <= 0 || !this.normalRoomsDone() || !this.isVisible(boss) || distance(this.hero, boss) > 100) return fail('Explore Floor 3 and reach the king’s chamber first.');
    this.mode = 'boss'; this.bossResult = null; this.bossSeconds = BOSS.seconds;
    this.hero.hp = this.hero.maxHp; this.cooldowns = { 'power-strike': 0, heal: 0 }; boss.active = true;
    this.order = null; this.destination = null; this.events.push({ type: 'save' }); return ok;
  }
  private normalRoomsDone() { return this.actors.every(a => a.kind !== 'skeleton' || a.hp <= 0) && this.chests.every(c => c.opened); }
  leaveBoss() { if (this.mode !== 'victory' && this.hero.hp > 0) this.die(); }
  private die() {
    if (this.mode === 'boss') this.bossResult = 'defeat';
    this.mode = 'farming'; this.hero.hp = 0; this.changeState(this.hero, 'dead'); this.respawnIn = this.stats.respawn;
    this.order = null; this.destination = null; this.failures++; this.events.push({ type: 'save' });
  }
  buyUpgrade(id: UpgradeId): PurchaseResult {
    if (this.mode !== 'farming') return fail('Upgrades are available between boss attempts.');
    if (!UPGRADE_IDS.includes(id)) return fail('Unknown upgrade.');
    const price = upgradePrice(id, this.levels[id]);
    if (price === null) return fail('Maximum level reached.');
    if (this.gold < price) return fail('Not enough gold.');
    this.gold -= price; this.levels[id]++; this.hero.maxHp = this.stats.maxHp; return ok;
  }
  setAbility(ability: Ability) { if (this.mode === 'farming' && (ability === 'heal' || ability === 'power-strike')) this.ability = ability; }
  private changeState(a: Actor, state: ActorState) { if (a.state !== state) { a.state = state; a.stateTime = 0; } }
  private reward(amount: number) { this.gold = Math.min(MAX_GOLD, this.gold + amount); this.rewards.push({ time: this.farmingTime, amount }); }
  private hit(source: Actor, target: Actor) {
    const range = source.kind === 'boss' || target.kind === 'boss' ? BOSS.range : DEMO.attackRange;
    if (target.hp <= 0 || source.hp <= 0 || distance(source, target) > range + 1 || !sight(this.dungeon, source, target)) return;
    const damage = source.kind === 'hero' ? source.attackDamage : (source.kind === 'boss' ? BOSS.damage : DEMO.enemyAtk * floorById(this.floor).damage) * 100 / (100 + this.stats.def);
    target.hp = Math.max(0, target.hp - damage); target.flash = .08; target.flashKind = 'hit';
    this.events.push({ type: 'hit', source: source.id, target: target.id, amount: damage, power: source.attackPower, angle: Math.atan2(target.y - source.y, target.x - source.x) });
    if (target.hp <= 0) {
      this.changeState(target, 'dead'); this.events.push({ type: 'death', target: target.id, x: target.x, y: target.y });
      if (target.kind === 'hero') this.die();
      else {
        this.reward(floorById(this.floor).reward * (target.kind === 'boss' ? 8 : 1));
        if (target.kind === 'boss') { this.bossDefeated = true; this.unlockedFloor = 4; this.mode = 'victory'; this.bossResult = 'victory'; this.transition = 3; }
        this.brainWait = 0; this.events.push({ type: 'save' });
      }
    }
  }
  private updateVision() {
    const next = cell(this.dungeon, this.hero);
    if (next !== this.lastCell || distance(this.hero, this.visionPoint) >= 4) { this.lastCell = next; this.visionPoint = { x: this.hero.x, y: this.hero.y }; this.visible = reveal(this.dungeon, this.hero, this.explored); this.brainWait = 0; }
  }
  private chooseDestination(): Point | null {
    if (this.order) {
      const order = this.order;
      const p = order.kind === 'move' ? point(this.dungeon, cell(this.dungeon, order)) : order.kind === 'chest'
        ? this.chests.find(c => c.id === order.id && !c.opened) : this.actors.find(a => a.id === order.id && a.hp > 0);
      if (p && distance(this.hero, p) > (order.kind === 'move' ? 2 : 18)) {
        this.activity = order.kind === 'chest' ? 'To chest · Auto afterwards' : order.kind === 'enemy' ? 'Targeting · Auto afterwards' : 'Moving · Auto afterwards'; return p;
      }
      this.order = null;
    }
    if (this.readyToExit && route(this.dungeon, this.hero, this.dungeon.exit, this.explored).length) {
      this.activity = 'To the stairs'; return this.dungeon.exit;
    }
    const knownLoot = this.chests.filter(c => !c.opened && this.isVisible(c));
    if (knownLoot.length) { this.activity = 'Collecting treasure'; return knownLoot.sort((a, b) => distance(a, this.hero) - distance(b, this.hero))[0]; }
    const candidates: Point[] = [];
    for (let i = 0; i < this.explored.length; i++) if (this.explored[i] && this.dungeon.tiles[i] && distance(this.hero, point(this.dungeon, i)) > 6 && neighbors(this.dungeon, i).some(n => !this.explored[n])) candidates.push(point(this.dungeon, i));
    for (const r of this.combatRooms) if (r.kind !== 'boss' && this.roomKnown(r.id) && this.actors.some(a => a.room === r.id && a.hp > 0)) candidates.push(center(r));
    for (const a of this.actors) if (a.kind !== 'hero' && a.hp > 0 && this.isVisible(a) && (a.kind !== 'boss' || this.normalRoomsDone())) candidates.push(a);
    for (const c of this.chests) if (!c.opened && this.explored[cell(this.dungeon, c)]) candidates.push(c);
    if (this.normalRoomsDone()) { const boss = this.actors.find(a => a.kind === 'boss' && a.hp > 0); if (boss && this.explored[cell(this.dungeon, boss)]) candidates.push(boss); }
    let best: Point | null = null, shortest = Infinity;
    for (const p of candidates) { const path = route(this.dungeon, this.hero, p, this.explored); if (path.length && path.length < shortest) { best = p; shortest = path.length; } }
    if (best) { this.activity = 'Exploring'; return { x: best.x, y: best.y }; }
    if (this.readyToExit) { this.activity = 'To the stairs'; return this.dungeon.exit; }
    this.activity = 'Finding a route'; return null;
  }
  private move(a: Actor, to: Point, dt: number) {
    const key = `${cell(this.dungeon, to)}`;
    let path = this.paths.get(a.id);
    if (!path || path.key !== key || !path.steps.length) {
      path = { key, steps: route(this.dungeon, a, to, a.kind === 'hero' ? this.explored : undefined) };
      if (path.steps.length > 1 && distance(a, path.steps[0]) < .4) path.steps.shift();
      this.paths.set(a.id, path);
    }
    while (path.steps.length && distance(a, path.steps[0]) < .4) path.steps.shift();
    const target = path.steps[0]; if (!target) { this.changeState(a, 'idle'); return; }
    const dist = distance(a, target), speed = a.kind === 'hero' ? (this.inCombat ? 36 : 72) : a.kind === 'boss' ? 13 : 15;
    const amount = Math.min(dist, speed * dt);
    const next = { x: a.x + (target.x - a.x) / dist * amount, y: a.y + (target.y - a.y) / dist * amount };
    if (fits(this.dungeon, next, a.kind === 'boss' ? 12 : 5)) {
      if (Math.abs(target.x - a.x) > .4) a.facing = target.x > a.x ? 1 : -1;
      a.x = next.x; a.y = next.y; this.changeState(a, 'walk');
    } else this.paths.delete(a.id);
  }
  private separate(dt: number) {
    const living = this.actors.filter(a => a.hp > 0);
    for (let i = 0; i < living.length; i++) for (let j = i + 1; j < living.length; j++) {
      const a = living[i], b = living[j], gap = distance(a, b), min = a.kind === 'boss' || b.kind === 'boss' ? 27 : 14;
      if (gap >= min || !sight(this.dungeon, a, b)) continue;
      const dx = gap < .001 ? (a.id % 2 ? 1 : -1) : (a.x - b.x) / gap;
      const dy = gap < .001 ? 0 : (a.y - b.y) / gap;
      const push = Math.min((min - gap) / 2, dt * 14);
      for (const [actor, sign] of [[a, 1], [b, -1]] as const) {
        const p = { x: actor.x + dx * push * sign, y: actor.y + dy * push * sign };
        if (fits(this.dungeon, p, actor.kind === 'boss' ? 12 : 5)) { actor.x = p.x; actor.y = p.y; }
      }
    }
  }
  step(dt: number) {
    if (dt <= 0 || !Number.isFinite(dt)) return;
    this.elapsed += dt; this.farmingTime += dt; this.rewards = this.rewards.filter(r => r.time > this.farmingTime - 60);
    for (const k of ['power-strike', 'heal'] as const) this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);
    for (const a of this.actors) { a.stateTime += dt; a.flash = Math.max(0, a.flash - dt); a.spawnTime += dt; a.attackWait = Math.max(0, a.attackWait - dt); }
    if (this.hero.hp <= 0) {
      this.activity = 'Recovering'; this.respawnIn = Math.max(0, this.respawnIn - dt);
      if (!this.respawnIn) {
        let same = true;
        if (this.failures >= 2) {
          const previous = this.floor; this.floor = Math.max(1, ...this.clearedFloors.filter(f => f < this.floor));
          same = previous === this.floor; this.advanceFloors = false; this.failures = 0;
          this.notice = `Floor ${previous} was too strong · Farming Floor ${this.floor}`;
        }
        this.populate(same); this.events.push({ type: 'respawn' }, { type: 'save' });
      }
      return;
    }
    if (this.transition > 0) {
      this.transition = Math.max(0, this.transition - dt);
      if (!this.transition) {
        if (this.mode === 'victory') { this.mode = 'farming'; this.bossResult = null; this.brainWait = 0; }
        else {
          const hp = this.hero.hp, old = this.floor;
          if (this.advanceFloors) this.floor = Math.min(4, this.floor + 1, this.unlockedFloor);
          this.populate(old === this.floor); this.hero.hp = hp; this.events.push({ type: 'respawn' }, { type: 'save' });
        }
      }
      return;
    }
    if (this.mode === 'boss') { this.bossSeconds = Math.max(0, this.bossSeconds - dt); if (!this.bossSeconds) { this.die(); return; } }
    this.updateVision();
    if ((this.ability === 'heal' || this.bossDefeated) && this.cooldowns.heal === 0 && this.hero.hp <= this.hero.maxHp * (1 - DEMO.healFraction)) {
      const amount = this.hero.maxHp * DEMO.healFraction; this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + amount);
      this.hero.flash = .15; this.hero.flashKind = 'heal'; this.cooldowns.heal = DEMO.healCooldown; this.events.push({ type: 'heal', target: this.hero.id, amount });
    }
    for (const a of this.actors) {
      if (a.kind === 'hero' || a.hp <= 0) continue;
      if (a.kind === 'boss') { if (this.mode === 'farming' && this.normalRoomsDone() && distance(a, this.hero) < 100 && this.isVisible(a)) this.startBoss(); continue; }
      if (distance(a, this.hero) < 76 && sight(this.dungeon, a, this.hero)) a.active = true;
      if (a.active && distance(this.hero, { x: a.homeX, y: a.homeY }) > 160) { a.active = false; a.hp = a.maxHp; }
    }
    for (const a of this.actors) {
      if (a.hp <= 0 || this.hero.hp <= 0 || this.bossResult === 'victory') continue;
      if (a.state === 'attack') {
        if (!a.hitDelivered && a.stateTime >= (a.kind === 'boss' ? BOSS.hitTime : DEMO.hitTime)) { a.hitDelivered = true; const t = this.actors.find(t => t.id === a.attackTarget); if (t) this.hit(a, t); }
        if (a.stateTime < (a.kind === 'boss' ? BOSS.attackDuration : DEMO.attackDuration)) continue;
        this.changeState(a, 'idle');
      }
      if (a.hp <= 0 || this.hero.hp <= 0 || this.mode === 'victory') continue;
      const candidates = a.kind === 'hero' ? this.actors.filter(t => t.kind !== 'hero' && t.hp > 0 && t.active && this.isVisible(t)) : a.active ? [this.hero] : [];
      candidates.sort((b, c) => (this.order?.kind === 'enemy' && this.order.id === b.id ? -1 : this.order?.kind === 'enemy' && this.order.id === c.id ? 1 : distance(b, a) - distance(c, a)));
      const target = candidates[0];
      if (target) {
        if (a.kind === 'hero') this.activity = this.order ? 'Fighting · Order resumes next' : this.mode === 'boss' ? 'Fighting the Goblin King' : 'Clearing the room';
        const range = a.kind === 'boss' || target.kind === 'boss' ? BOSS.range : DEMO.attackRange;
        if (distance(a, target) > range + 1e-6 || !sight(this.dungeon, a, target)) this.move(a, target, dt);
        else if (!a.attackWait) {
          if (Math.abs(target.x - a.x) > 1) a.facing = target.x >= a.x ? 1 : -1;
          this.changeState(a, 'attack'); a.attackTarget = target.id; a.hitDelivered = false;
          a.attackPower = a.kind === 'hero' && (this.ability === 'power-strike' || this.bossDefeated) && !this.cooldowns['power-strike'];
          a.attackDamage = a.kind === 'hero' ? this.stats.atk * (a.attackPower ? DEMO.powerMultiplier : 1) : DEMO.enemyAtk;
          if (a.attackPower) this.cooldowns['power-strike'] = DEMO.powerCooldown;
          a.attackWait = a.kind === 'hero' ? DEMO.attackInterval : a.kind === 'boss' ? BOSS.interval : DEMO.enemyAttackInterval;
        } else this.changeState(a, 'idle');
      } else if (a.kind === 'hero') {
        this.brainWait -= dt;
        if (this.brainWait <= 0 || !this.destination || distance(a, this.destination) < 2) { this.destination = this.chooseDestination(); this.brainWait = .4; }
        if (this.destination) this.move(a, this.destination, dt); else this.changeState(a, 'idle');
      } else if (distance(a, { x: a.homeX, y: a.homeY }) > 2) this.move(a, { x: a.homeX, y: a.homeY }, dt);
      else this.changeState(a, 'idle');
    }
    this.separate(dt);
    this.updateVision();
    if (!this.inCombat && this.hero.hp > 0) {
      for (const c of this.chests) if (!c.opened && distance(c, this.hero) < 20 && sight(this.dungeon, this.hero, c)) {
        c.opened = true; this.reward(floorById(this.floor).reward); this.brainWait = 0; this.events.push({ type: 'save' });
      }
      if (!this.completed && this.readyToExit && distance(this.hero, this.dungeon.exit) < 12) {
        this.completed = true; this.completedRuns++; this.failures = 0; this.reward(floorById(this.floor).reward);
        if (!this.clearedFloors.includes(this.floor)) this.clearedFloors.push(this.floor);
        this.unlockedFloor = Math.max(this.unlockedFloor, Math.min(this.floor + 1, this.bossDefeated ? 4 : 3));
        this.transition = 2; this.activity = 'Floor cleared · Descending'; this.events.push({ type: 'save' });
      }
    }
    if (!this.inCombat && !this.transition && this.hero.hp > 0 && distance(this.hero, this.lastPosition) < .01) this.stalled += dt; else this.stalled = 0;
    this.lastPosition = { x: this.hero.x, y: this.hero.y };
    if (this.stalled > 3) { this.paths.clear(); this.brainWait = 0; this.destination = null; }
    if (this.stalled > 10) { this.navigationRecoveries++; this.notice = 'Route interrupted · Returning to the entrance'; this.die(); }
  }
  exportSave(): SaveData {
    const run: RunSave = { layout: this.dungeon.id, revision: this.dungeon.revision, id: this.runId,
      actors: this.actors.map(a => ({ ...a })), chests: this.chests.map(c => ({ ...c })), explored: [...this.explored],
      completed: this.completed, transition: this.transition, mode: this.mode, bossSeconds: this.bossSeconds, bossResult: this.bossResult,
      elapsed: this.elapsed, randomState: this.randomState, order: this.order ? { ...this.order } : null };
    return { version: 3, floor: this.floor, bossDefeated: this.bossDefeated, gold: this.gold, levels: { ...this.levels }, ability: this.ability,
      heroHp: this.hero.hp, respawnIn: this.respawnIn, cooldowns: { ...this.cooldowns }, unlockedFloor: this.unlockedFloor,
      clearedFloors: [...this.clearedFloors], advanceFloors: this.advanceFloors, failures: this.failures, completedRuns: this.completedRuns, run };
  }
  restore(data: SaveData) {
    this.reset(); this.gold = data.gold; this.levels = { ...data.levels }; this.ability = data.ability;
    this.floor = data.floor; this.bossDefeated = data.bossDefeated; this.unlockedFloor = data.unlockedFloor;
    this.clearedFloors = [...data.clearedFloors]; this.advanceFloors = data.advanceFloors; this.failures = data.failures; this.completedRuns = data.completedRuns;
    this.populate(false); this.hero.hp = data.heroHp; this.cooldowns = { ...data.cooldowns }; this.respawnIn = data.respawnIn;
    if (data.run && data.run.layout === this.dungeon.id && data.run.revision === this.dungeon.revision) {
      const r = data.run; this.actors = r.actors.map(a => ({ ...a })); this.chests = r.chests.map(c => ({ ...c })); this.explored = [...r.explored];
      this.runId = r.id; this.completed = r.completed; this.transition = r.transition; this.mode = r.mode;
      this.bossSeconds = r.bossSeconds; this.bossResult = r.bossResult; this.elapsed = r.elapsed; this.randomState = r.randomState;
      this.order = r.order ? { ...r.order } : null;
      if (this.mode === 'boss') this.die();
    } else if (data.run) this.notice = 'Dungeon updated · Continuing from the entrance';
    if (!this.hero.hp) this.hero.state = 'dead';
    // Reconstruct the visible subset without discovering extra tiles on reload.
    this.lastCell = cell(this.dungeon, this.hero); this.visionPoint = { x: this.hero.x, y: this.hero.y };
    this.visible = new Set([...reveal(this.dungeon, this.hero, [...this.explored])].filter(i => this.explored[i]));
    this.lastPosition = { x: this.hero.x, y: this.hero.y }; this.events = [];
  }
  drainEvents() { const events = this.events; this.events = []; return events; }
}
