import { DEMO, MAX_GOLD } from './balance.ts';
import { freshLevels, heroStats, upgradePrice, upgradeViews, UPGRADE_IDS } from './progression.ts';
import type { Ability, PurchaseResult, SaveData, UpgradeId } from './types.ts';
export type { Ability } from './types.ts';
export { DEMO } from './balance.ts';
export type ActorState = 'idle' | 'walk' | 'attack' | 'dead';

export interface Actor {
  id: number;
  kind: 'hero' | 'skeleton';
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  facing: number;
  state: ActorState;
  stateTime: number;
  attackWait: number;
  attackTarget: number;
  attackPower: boolean;
  attackDamage: number;
  hitDelivered: boolean;
  flash: number;
  flashKind: 'hit' | 'heal';
  spawnTime: number;
}

export type CombatEvent =
  | { type: 'hit'; source: number; target: number; amount: number; power: boolean; angle: number }
  | { type: 'heal'; target: number; amount: number }
  | { type: 'death'; target: number; x: number; y: number }
  | { type: 'respawn' };

// Arrive slightly inside melee range so crowd separation cannot keep an actor
// walking on the boundary. The epsilon only absorbs floating-point rounding.
const MELEE_ARRIVAL_MARGIN = 0.5;
const DISTANCE_EPSILON = 1e-6;

/** Deterministic farming simulation; rendering and storage live outside it. */
export class CombatSimulation {
  actors: Actor[] = [];
  events: CombatEvent[] = [];
  elapsed = 0;
  gold = 0;
  levels = freshLevels();
  ability: Ability = 'power-strike';
  cooldowns: Record<Ability, number> = { 'power-strike': 0.7, heal: 0 };
  respawnIn = 0;
  private nextId = 1;
  private randomState = 41;
  private spawnDelay = 0;

  private seed: number;
  constructor(seed = 41) { this.seed = seed; this.reset(); }

  get hero(): Actor { return this.actors[0]; }
  get stats() { return heroStats(this.levels); }
  get upgrades() { return upgradeViews(this.levels, this.gold); }

  buyUpgrade(id: UpgradeId): PurchaseResult {
    if (!UPGRADE_IDS.includes(id)) return { ok: false, reason: 'Unknown upgrade.' };
    const price = upgradePrice(id, this.levels[id]);
    if (price === null) return { ok: false, reason: 'Maximum level reached.' };
    if (this.gold < price) return { ok: false, reason: 'Not enough gold.' };
    this.gold -= price;
    this.levels[id]++;
    this.hero.maxHp = this.stats.maxHp;
    return { ok: true };
  }

  exportSave(): SaveData {
    return { version: 1, gold: this.gold, levels: { ...this.levels }, ability: this.ability,
      heroHp: this.hero.hp, respawnIn: this.respawnIn, cooldowns: { ...this.cooldowns } };
  }

  restore(data: SaveData) {
    this.reset();
    this.gold = data.gold; this.levels = { ...data.levels }; this.ability = data.ability;
    this.populate();
    this.hero.hp = data.heroHp; this.cooldowns = { ...data.cooldowns }; this.respawnIn = data.respawnIn;
    if (this.hero.hp === 0) this.hero.state = 'dead';
  }

  private random() {
    this.randomState = (Math.imul(this.randomState, 1664525) + 1013904223) >>> 0;
    return this.randomState / 4294967296;
  }

  private actor(kind: Actor['kind'], x: number, y: number): Actor {
    const maxHp = kind === 'hero' ? this.stats.maxHp : 68 + Math.floor(this.random() * 35);
    return {
      id: this.nextId++, kind, x, y, hp: maxHp, maxHp,
      facing: x < 90 ? 1 : -1, state: 'idle', stateTime: 0,
      attackWait: kind === 'hero' ? 0.45 : 1 + this.random(),
      attackTarget: 0, attackPower: false, attackDamage: 0, hitDelivered: false,
      flash: 0, flashKind: 'hit', spawnTime: 0,
    };
  }

  reset() {
    this.nextId = 1;
    this.randomState = this.seed;
    this.elapsed = 0;
    this.gold = 0;
    this.levels = freshLevels();
    this.respawnIn = 0;
    this.spawnDelay = 0;
    this.cooldowns = { 'power-strike': 0.7, heal: 0 };
    this.events = [];
    this.populate();
  }

  private populate() {
    this.actors = [this.actor('hero', 88, 139)];
    for (const [x, y] of [[116, 133], [49, 88], [130, 71], [47, 189], [129, 209]]) {
      this.actors.push(this.actor('skeleton', x, y));
    }
  }

  setAbility(ability: Ability) { this.ability = ability; }

  private changeState(actor: Actor, state: ActorState) {
    if (actor.state !== state) { actor.state = state; actor.stateTime = 0; }
  }

  private hit(source: Actor, target: Actor) {
    if (target.hp <= 0 || source.hp <= 0) return;
    const damage = source.kind === 'hero'
      ? source.attackDamage
      : DEMO.enemyAtk * 100 / (100 + this.stats.def);
    target.hp = Math.max(0, target.hp - damage);
    target.flash = 0.08;
    target.flashKind = 'hit';
    this.events.push({ type: 'hit', source: source.id, target: target.id, amount: damage,
      power: source.attackPower, angle: Math.atan2(target.y - source.y, target.x - source.x) });
    if (target.hp <= 0) {
      this.changeState(target, 'dead');
      this.events.push({ type: 'death', target: target.id, x: target.x, y: target.y });
      if (target.kind === 'skeleton') this.gold = Math.min(MAX_GOLD, this.gold + 1);
      else this.respawnIn = this.stats.respawn;
    }
  }

  step(dt: number) {
    if (dt <= 0 || !Number.isFinite(dt)) return;
    this.elapsed += dt;
    for (const key of ['power-strike', 'heal'] as const) {
      this.cooldowns[key] = Math.max(0, this.cooldowns[key] - dt);
    }
    for (const actor of this.actors) {
      actor.stateTime += dt;
      actor.flash = Math.max(0, actor.flash - dt);
      actor.spawnTime += dt;
      actor.attackWait = Math.max(0, actor.attackWait - dt);
    }

    if (this.hero.hp <= 0) {
      this.respawnIn = Math.max(0, this.respawnIn - dt);
      if (this.respawnIn === 0) {
        this.populate();
        this.events.push({ type: 'respawn' });
      }
      return;
    }

    if (this.ability === 'heal' && this.cooldowns.heal === 0 && this.hero.hp <= this.hero.maxHp * (1 - DEMO.healFraction)) {
      const amount = this.hero.maxHp * DEMO.healFraction;
      this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + amount);
      this.hero.flash = 0.15;
      this.hero.flashKind = 'heal';
      this.cooldowns.heal = DEMO.healCooldown;
      this.events.push({ type: 'heal', target: this.hero.id, amount });
    }

    for (const actor of this.actors) {
      if (actor.hp <= 0 || this.hero.hp <= 0) continue;
      if (actor.state === 'attack') {
        if (!actor.hitDelivered && actor.stateTime >= DEMO.hitTime) {
          actor.hitDelivered = true;
          const target = this.actors.find((candidate) => candidate.id === actor.attackTarget);
          if (target) this.hit(actor, target);
        }
        if (actor.stateTime < DEMO.attackDuration) continue;
        this.changeState(actor, 'idle');
      }

      const targets = actor.kind === 'hero'
        ? this.actors.filter((candidate) => candidate.kind === 'skeleton' && candidate.hp > 0)
        : [this.hero];
      const target = targets.sort((a, b) => Math.hypot(a.x - actor.x, a.y - actor.y) - Math.hypot(b.x - actor.x, b.y - actor.y))[0];
      if (!target) { this.changeState(actor, 'idle'); continue; }
      const dx = target.x - actor.x;
      const dy = target.y - actor.y;
      const distance = Math.hypot(dx, dy);
      if (Math.abs(dx) > 2) actor.facing = dx >= 0 ? 1 : -1;
      if (distance > DEMO.attackRange + DISTANCE_EPSILON) {
        this.changeState(actor, 'walk');
        const speed = actor.kind === 'hero' ? DEMO.heroSpeed : DEMO.skeletonSpeed;
        const travel = Math.min(speed * dt, distance - (DEMO.attackRange - MELEE_ARRIVAL_MARGIN));
        actor.x += dx / distance * travel;
        actor.y += dy / distance * travel;
      } else if (actor.attackWait === 0) {
        this.changeState(actor, 'attack');
        actor.attackTarget = target.id;
        actor.hitDelivered = false;
        actor.attackPower = actor.kind === 'hero' && this.ability === 'power-strike' && this.cooldowns['power-strike'] === 0;
        actor.attackDamage = actor.kind === 'hero' ? this.stats.atk * (actor.attackPower ? DEMO.powerMultiplier : 1) : DEMO.enemyAtk;
        if (actor.attackPower) this.cooldowns['power-strike'] = DEMO.powerCooldown;
        actor.attackWait = actor.kind === 'hero' ? DEMO.attackInterval : DEMO.enemyAttackInterval;
      } else {
        this.changeState(actor, 'idle');
      }
    }

    // Keep feet separated without obstacles or a pathfinding system.
    const living = this.actors.filter((actor) => actor.hp > 0);
    for (let i = 0; i < living.length; i++) {
      for (let j = i + 1; j < living.length; j++) {
        const a = living[i]; const b = living[j];
        const dx = b.x - a.x; const dy = b.y - a.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 22 && distance > 0.01) {
          const push = (22 - distance) * Math.min(0.5, dt * 4);
          a.x -= dx / distance * push; a.y -= dy / distance * push;
          b.x += dx / distance * push; b.y += dy / distance * push;
        }
      }
    }
    for (const actor of living) {
      actor.x = Math.max(29, Math.min(153, actor.x));
      actor.y = Math.max(60, Math.min(222, actor.y));
    }

    this.actors = this.actors.filter((actor) => actor.kind === 'hero' || actor.hp > 0 || actor.stateTime < 0.45);
    this.spawnDelay = Math.max(0, this.spawnDelay - dt);
    if (this.actors.filter((actor) => actor.kind === 'skeleton').length < 5 && this.spawnDelay === 0) {
      const positions = [[40, 70], [140, 78], [39, 210], [134, 218], [86, 65]];
      const [x, y] = positions[Math.floor(this.random() * positions.length)];
      this.actors.push(this.actor('skeleton', x, y));
      this.spawnDelay = 0.85;
    }
  }

  drainEvents() { const result = this.events; this.events = []; return result; }
}
