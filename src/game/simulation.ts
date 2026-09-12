export type Ability = 'power-strike' | 'heal';
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

export const DEMO = {
  width: 180, height: 244, heroHp: 224, heroAtk: 24, heroDef: 12,
  heroSpeed: 18, skeletonSpeed: 5.8, attackRange: 23,
  attackDuration: 0.28, hitTime: 0.12, attackInterval: 1,
  enemyAttackInterval: 1.65, enemyAtk: 4,
  respawnSeconds: 5, powerCooldown: 6, healCooldown: 10,
} as const;

// Arrive slightly inside melee range so crowd separation cannot keep an actor
// walking on the boundary. The epsilon only absorbs floating-point rounding.
const MELEE_ARRIVAL_MARGIN = 0.5;
const DISTANCE_EPSILON = 1e-6;

/** A small deterministic combat study. No persistence, upgrade or floor systems. */
export class CombatSimulation {
  actors: Actor[] = [];
  events: CombatEvent[] = [];
  elapsed = 0;
  gold = 0;
  ability: Ability = 'power-strike';
  cooldowns: Record<Ability, number> = { 'power-strike': 0.7, heal: 0 };
  respawnIn = 0;
  private nextId = 1;
  private randomState = 41;
  private spawnDelay = 0;

  constructor() { this.reset(); }

  get hero(): Actor { return this.actors[0]; }

  private random() {
    this.randomState = (Math.imul(this.randomState, 1664525) + 1013904223) >>> 0;
    return this.randomState / 4294967296;
  }

  private actor(kind: Actor['kind'], x: number, y: number): Actor {
    const maxHp = kind === 'hero' ? DEMO.heroHp : 68 + Math.floor(this.random() * 35);
    return {
      id: this.nextId++, kind, x, y, hp: maxHp, maxHp,
      facing: x < 90 ? 1 : -1, state: 'idle', stateTime: 0,
      attackWait: kind === 'hero' ? 0.45 : 1 + this.random(),
      attackTarget: 0, attackPower: false, hitDelivered: false,
      flash: 0, flashKind: 'hit', spawnTime: 0,
    };
  }

  reset() {
    this.nextId = 1;
    this.randomState = 41;
    this.elapsed = 0;
    this.gold = 0;
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
      ? DEMO.heroAtk * (source.attackPower ? 3 : 1)
      : DEMO.enemyAtk * 100 / (100 + DEMO.heroDef);
    target.hp = Math.max(0, target.hp - damage);
    target.flash = 0.08;
    target.flashKind = 'hit';
    this.events.push({ type: 'hit', source: source.id, target: target.id, amount: damage,
      power: source.attackPower, angle: Math.atan2(target.y - source.y, target.x - source.x) });
    if (target.hp <= 0) {
      this.changeState(target, 'dead');
      this.events.push({ type: 'death', target: target.id, x: target.x, y: target.y });
      if (target.kind === 'skeleton') this.gold += 1;
      else this.respawnIn = DEMO.respawnSeconds;
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

    if (this.ability === 'heal' && this.cooldowns.heal === 0 && this.hero.hp <= this.hero.maxHp * 0.8) {
      const amount = this.hero.maxHp * 0.2;
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
