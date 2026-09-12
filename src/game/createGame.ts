import Phaser from 'phaser';
import { CombatSimulation } from './simulation';
import type { Actor, Ability, CombatEvent } from './simulation';
import { buildCharacterTextures, buildDungeonTexture, buildEffectTextures, numberTexture } from './textures';

interface ActorView {
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  bar: Phaser.GameObjects.Graphics;
}
interface Effect {
  sprite: Phaser.GameObjects.Image;
  start: number;
  duration: number;
  kind: 'slash' | 'impact' | 'number';
  x: number; y: number;
  scale: number;
}
interface Spark {
  sprite: Phaser.GameObjects.Rectangle;
  start: number;
  duration: number;
  x: number; y: number; dx: number; dy: number;
}

export function createGame(parent: HTMLElement) {
  const simulation = new CombatSimulation();
  let paused = false;
  let ready = false;
  let accumulator = 0;
  let sceneInstance: DungeonScene | undefined;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const nativeHeight = () => Math.max(180, Math.min(280, Math.round(parent.clientHeight / Math.max(1, parent.clientWidth) * 180)));

  class DungeonScene extends Phaser.Scene {
    private views = new Map<number, ActorView>();
    private effects: Effect[] = [];
    private sparks: Spark[] = [];
    private glow: Phaser.GameObjects.Graphics | undefined;
    private respawn: Phaser.GameObjects.Text | undefined;

    constructor() { super('dungeon'); }

    preload() {
      const loading = this.add.text(90, nativeHeight() / 2, 'Entering the dungeon…', {
        fontFamily: 'Inter, sans-serif', fontSize: '7px', color: '#ada6b7',
      }).setOrigin(0.5);
      this.load.on('complete', () => loading.destroy());
      this.load.on('loaderror', (file: Phaser.Loader.File) => {
        parent.dataset.loadError = file.key;
        console.error(`Unable to load game asset: ${file.key}`);
      });
      this.load.image('dungeon-source', '/assets/environment/dungeon.png');
      this.load.image('hero-source', '/assets/characters/hero-sheet.png');
      this.load.image('skeleton-source', '/assets/characters/skeleton-sheet.png');
      this.load.json('character-loading', '/assets/characters/loading.json');
      this.load.image('combat-source', '/assets/effects/combat-alpha.png');
    }

    create() {
      buildDungeonTexture(this);
      buildCharacterTextures(this);
      buildEffectTextures(this);
      this.add.image(90, 122, 'dungeon').setDepth(-10);
      this.glow = this.add.graphics().setDepth(-5);
      this.respawn = this.add.text(90, 132, '', {
        fontFamily: 'Inter, sans-serif', fontSize: '7px', fontStyle: 'bold',
        color: '#ddd6d0', backgroundColor: '#181827', padding: { x: 7, y: 5 },
      }).setOrigin(0.5).setDepth(1000);
      const height = nativeHeight();
      this.scale.resize(180, height);
      this.cameras.main.setSize(180, height).setScroll(0, (244 - height) / 2).setRoundPixels(true);
      sceneInstance = this;
      ready = true;
      parent.dataset.ready = 'true';
      this.drawScene();
    }

    resetVisuals() {
      for (const view of this.views.values()) { view.sprite.destroy(); view.shadow.destroy(); view.bar.destroy(); }
      this.views.clear();
      this.effects.forEach((effect) => effect.sprite.destroy());
      this.sparks.forEach((spark) => spark.sprite.destroy());
      this.effects = []; this.sparks = [];
      accumulator = 0;
      this.drawScene();
    }

    capturePowerStrike() {
      simulation.reset();
      simulation.setAbility('power-strike');
      this.resetVisuals();
      for (let tick = 0; tick < 600; tick++) {
        simulation.step(1 / 60);
        simulation.drainEvents().forEach((event) => this.combatEvent(event));
        this.drawScene();
        if (simulation.hero.state === 'attack' && simulation.hero.attackPower && simulation.hero.stateTime >= 0.25) break;
      }
      paused = true;
      this.drawScene();
    }

    private actorView(actor: Actor) {
      let view = this.views.get(actor.id);
      if (!view) {
        const shadow = this.add.image(actor.x, actor.y - 1, 'contact-shadow').setAlpha(0.55).setScale(actor.kind === 'hero' ? 1 : 0.85);
        const sprite = this.add.image(actor.x, actor.y, `${actor.kind}-0`).setOrigin(0.5, 40 / 48);
        const bar = this.add.graphics();
        view = { sprite, shadow, bar };
        this.views.set(actor.id, view);
      }
      return view;
    }

    private addNumber(actor: Actor, amount: number, heal: boolean, power: boolean) {
      const label = `${heal ? '+' : ''}${Math.round(amount)}`;
      const color = heal ? '#84fa81' : power ? '#ffd16c' : actor.kind === 'hero' ? '#ed6973' : '#ff6238';
      const texture = numberTexture(this, label, color);
      const x = actor.x + (actor.facing > 0 ? 5 : -5);
      const y = actor.y - (actor.kind === 'hero' ? 29 : 27);
      const sprite = this.add.image(x, y, texture).setDepth(600);
      const numbers = this.effects.filter((effect) => effect.kind === 'number');
      if (numbers.length >= 8) { numbers[0].duration = 0; }
      this.effects.push({ sprite, start: simulation.elapsed, duration: 0.7, kind: 'number', x, y, scale: power ? 1.25 : 1 });
    }

    private addEffect(kind: 'slash' | 'impact', x: number, y: number, scale: number, angle: number) {
      const sprite = this.add.image(x, y, `combat-${kind === 'slash' ? 0 : 4}`)
        .setDepth(350).setScale(scale).setRotation(kind === 'slash' ? angle - 0.2 : 0);
      this.effects.push({ sprite, start: simulation.elapsed, duration: kind === 'slash' ? 0.24 : 0.2, kind, x, y, scale });
    }

    private addSparks(x: number, y: number, heal = false, count = 5) {
      for (let index = 0; index < count; index++) {
        const angle = index * 2.399 + simulation.elapsed;
        const dx = heal ? Math.sin(angle) * 5 : Math.cos(angle) * (5 + index);
        const dy = heal ? -12 - index : Math.sin(angle) * (5 + index) - 2;
        const sprite = this.add.rectangle(x, y, index % 2 ? 1 : 2, index % 2 ? 2 : 1, heal ? 0x9cfaa0 : index % 2 ? 0xffd16c : 0xff6805)
          .setDepth(400);
        this.sparks.push({ sprite, start: simulation.elapsed, duration: heal ? 0.7 : 0.4, x, y, dx, dy });
      }
    }

    private combatEvent(event: CombatEvent) {
      if (event.type === 'respawn') { this.resetVisuals(); return; }
      if (event.type === 'death') { this.addSparks(event.x, event.y - 8, false, 7); return; }
      const target = simulation.actors.find((actor) => actor.id === event.target);
      if (!target) return;
      if (event.type === 'heal') {
        this.addNumber(target, event.amount, true, false);
        this.addSparks(target.x, target.y - 8, true, 8);
        this.actorView(target).sprite.setTint(0xa8ffbe);
        target.flash = 0.15;
        return;
      }
      this.addNumber(target, event.amount, false, event.power);
      const source = simulation.actors.find((actor) => actor.id === event.source);
      if (source?.kind === 'hero') {
        this.addEffect('slash', source.x, source.y - 13, event.power ? 0.88 : 0.53, event.angle);
        this.addEffect('impact', target.x, target.y - 12, event.power ? 0.44 : 0.26, 0);
        this.addSparks(target.x, target.y - 12, false, event.power ? 7 : 3);
      }
    }

    private drawScene() {
      const liveIds = new Set(simulation.actors.map((actor) => actor.id));
      for (const [id, view] of this.views) {
        if (!liveIds.has(id)) { view.sprite.destroy(); view.shadow.destroy(); view.bar.destroy(); this.views.delete(id); }
      }
      for (const actor of simulation.actors) {
        const view = this.actorView(actor);
        let frame: number;
        if (actor.state === 'attack') {
          frame = actor.stateTime < 0.065 ? 8 : actor.stateTime < 0.12 ? 9 : actor.stateTime < 0.195 ? 10 : 11;
        } else if (actor.state === 'walk') frame = 4 + Math.floor(actor.stateTime * 9) % 4;
        else frame = Math.floor((actor.stateTime + actor.id * 0.17) * 4) % 4;
        const dead = actor.state === 'dead';
        const fade = dead ? Math.max(0, 1 - actor.stateTime / 0.4) : Math.min(1, actor.spawnTime / 0.2);
        view.sprite.setTexture(`${actor.kind}-${frame}`).setPosition(Math.round(actor.x), Math.round(actor.y))
          .setFlipX(actor.facing < 0).setDepth(actor.y).setAlpha(fade);
        if (actor.flash > 0 && actor.hp > 0) view.sprite.setTint(actor.flashKind === 'heal' ? 0xa8ffbe : 0xffc1b4);
        else view.sprite.clearTint();
        view.shadow.setPosition(Math.round(actor.x), Math.round(actor.y) - 1).setDepth(actor.y - 0.1).setAlpha(fade * 0.55);
        view.bar.clear().setDepth(300);
        if (actor.kind === 'skeleton' && !dead) {
          const x = Math.round(actor.x) - 9;
          const y = Math.round(actor.y) - 28;
          view.bar.fillStyle(0x100e19, 0.95).fillRect(x, y, 19, 3);
          view.bar.fillStyle(0xc52b40, 1).fillRect(x + 1, y + 1, Math.max(1, Math.round(17 * actor.hp / actor.maxHp)), 1);
        }
      }

      const now = simulation.elapsed;
      this.effects = this.effects.filter((effect) => {
        const age = now - effect.start;
        if (age >= effect.duration) { effect.sprite.destroy(); return false; }
        const progress = age / effect.duration;
        if (effect.kind === 'number') {
          const movement = reducedMotion.matches ? 1 : 8;
          effect.sprite.setPosition(Math.round(effect.x), Math.round(effect.y - progress * movement));
          effect.sprite.setScale(effect.scale).setAlpha(Math.min(1, (1 - progress) * 4));
        } else {
          const frame = Math.min(3, Math.floor(progress * 4)) + (effect.kind === 'impact' ? 4 : 0);
          effect.sprite.setTexture(`combat-${frame}`).setAlpha(reducedMotion.matches ? 0.7 : 1);
        }
        return true;
      });
      this.sparks = this.sparks.filter((spark) => {
        const progress = (now - spark.start) / spark.duration;
        if (progress >= 1) { spark.sprite.destroy(); return false; }
        spark.sprite.setPosition(Math.round(spark.x + spark.dx * progress), Math.round(spark.y + spark.dy * progress))
          .setAlpha((1 - progress) * (reducedMotion.matches ? 0.45 : 1));
        return true;
      });

      this.glow?.clear();
      const flicker = reducedMotion.matches ? 0.035 : 0.03 + Math.sin(now * 8) * 0.008 + Math.sin(now * 17) * 0.005;
      for (const x of [20, 160]) {
        for (let radius = 18; radius >= 5; radius -= 4) {
          this.glow?.fillStyle(0xff861e, flicker).fillCircle(x, 48, radius);
        }
        // Tiny animated embers carry movement beyond the baked lighting in the environment.
        for (let i = 0; i < 2; i++) {
          const phase = (now * 0.7 + i * 0.5) % 1;
          this.glow?.fillStyle(0xffd879, (1 - phase) * 0.75)
            .fillRect(Math.round(x + Math.sin(now * 2 + i) * 2), Math.round(48 - phase * 10), 1, 1);
        }
      }
      this.respawn?.setText(simulation.respawnIn > 0 ? `Respawning: ${simulation.respawnIn.toFixed(1)}s` : '').setVisible(simulation.respawnIn > 0);
    }

    update(_time: number, delta: number) {
      if (!ready) return;
      if (!paused && !document.hidden) {
        accumulator += Math.min(delta / 1000, 0.1);
        while (accumulator >= 1 / 60) {
          simulation.step(1 / 60);
          simulation.drainEvents().forEach((event) => this.combatEvent(event));
          accumulator -= 1 / 60;
        }
      }
      this.drawScene();
    }
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO, parent, width: 180, height: nativeHeight(), backgroundColor: '#201932',
    scene: [DungeonScene], pixelArt: true, roundPixels: true,
    render: { antialias: false, pixelArt: true, roundPixels: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    audio: { noAudio: true }, banner: false,
    fps: { target: 60 },
  });
  const observer = new ResizeObserver(() => {
    if (ready) {
      game.scale.resize(180, nativeHeight());
      sceneInstance?.cameras.main.setSize(180, nativeHeight()).setScroll(0, (244 - nativeHeight()) / 2);
    }
  });
  observer.observe(parent);

  const controller = {
    pause() { paused = true; },
    resume() { paused = false; accumulator = 0; },
    reset() { simulation.reset(); sceneInstance?.resetVisuals(); },
    setAbility(ability: Ability) { simulation.setAbility(ability); },
    getSnapshot() {
      return {
        heroHp: simulation.hero.hp, maxHp: simulation.hero.maxHp, gold: simulation.gold,
        abilityCooldown: simulation.cooldowns[simulation.ability],
        abilityMaxCooldown: simulation.ability === 'heal' ? 10 : 6,
        isPaused: paused,
      };
    },
    destroy() { observer.disconnect(); game.destroy(true); },
  };
  // Read-only inspection and reproducible captures are kept out of the product controls.
  if (import.meta.env.DEV) {
    Object.assign(window, { __IDLECOMBATZ__: { controller, simulation,
      capturePowerStrike: () => sceneInstance?.capturePowerStrike(),
      get ready() { return ready; },
    } });
  }
  return controller;
}
