import Phaser from 'phaser';
import { CombatSimulation } from './simulation';
import type { Actor, Ability, CombatEvent } from './simulation';
import type { SceneController, UpgradeId } from './types';
import { DEMO } from './balance';
import { BOSS } from './world';
import { actorTexture, actorOpacity } from './animation';
import { SaveStore } from './save';
import { buildTileTextures, DungeonView, center } from './dungeon/render';
import { buildCharacterTextures, buildContactShadow, buildEffectTextures, buildExpansionTextures, numberTexture } from './textures';

interface ActorView {
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  bar: Phaser.GameObjects.Graphics;
}
interface Effect {
  sprite: Phaser.GameObjects.Image;
  start: number;
  duration: number;
  kind: 'slash' | 'impact' | 'boss-impact' | 'number';
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
  const saves = new SaveStore(() => window.localStorage);
  const saved = saves.load();
  if (saved) simulation.restore(saved);
  let inspecting = false;
  const persist = () => { if (!inspecting) saves.write(simulation.exportSave()); };
  let paused = false;
  let ready = false;
  let accumulator = 0;
  let sceneInstance: DungeonScene | undefined;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const nativeHeight = () => Math.max(96, Math.min(360, Math.round(parent.clientHeight / Math.max(1, parent.clientWidth) * 180)));

  class DungeonScene extends Phaser.Scene {
    private views = new Map<number, ActorView>();
    private effects: Effect[] = [];
    private sparks: Spark[] = [];
    private respawn: Phaser.GameObjects.Text | undefined;
    private worldView: DungeonView | undefined;

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
      this.load.image('atlas-source', '/assets/environment/dungeon-atlas-alpha.png');
      this.load.image('hero-source', '/assets/characters/hero-sheet.png');
      this.load.image('skeleton-source', '/assets/characters/skeleton-sheet.png');
      this.load.json('character-loading', '/assets/characters/loading.json');
      this.load.image('combat-source', '/assets/effects/combat-alpha.png');
      this.load.image('boss-source', '/assets/boss/goblin-king-sheet.png');
      this.load.image('hero-extra-source', '/assets/characters/extensions/hero-hurt-death.png');
      this.load.image('skeleton-extra-source', '/assets/characters/extensions/skeleton-hurt-death.png');
      this.load.image('boss-impact-source', '/assets/boss/impact.png');
      this.load.json('expansion-loading', '/assets/boss/loading.json');
    }

    create() {
      buildContactShadow(this);
      buildCharacterTextures(this);
      buildEffectTextures(this);
      buildExpansionTextures(this);
      buildTileTextures(this);
      this.worldView = new DungeonView(this);
      this.respawn = this.add.text(90, 132, '', {
        fontFamily: 'Inter, sans-serif', fontSize: '7px', fontStyle: 'bold',
        color: '#ddd6d0', backgroundColor: '#181827', padding: { x: 7, y: 5 },
      }).setOrigin(0.5).setDepth(11000).setScrollFactor(0);
      const height = nativeHeight();
      this.scale.getParentBounds();
      this.scale.setGameSize(180, height);
      this.cameras.main.setSize(180, height).setRoundPixels(true).centerOn(simulation.hero.x, simulation.hero.y - 18);
      this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
        if (pointer.getDistance() > 12 || paused) return;
        const p = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const enemy = simulation.actors.filter(a => a.kind !== 'hero' && a.hp > 0 && simulation.isVisible(a))
          .find(a => Math.abs(a.x - p.x) < 14 && Math.abs(a.y - 12 - p.y) < 20);
        const chest = simulation.chests.find(c => !c.opened && simulation.isVisible(c) && Math.hypot(c.x - p.x, c.y - p.y) < 18);
        const result = simulation.command(enemy ? { kind: 'enemy', id: enemy.id } : chest ? { kind: 'chest', id: chest.id } : { kind: 'move', x: p.x, y: p.y });
        parent.dispatchEvent(new CustomEvent('dungeon-command', { detail: result, bubbles: true }));
        if (result.ok) persist();
      });
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
      this.cameras.main.centerOn(simulation.hero.x, simulation.hero.y - 18);
      this.drawScene();
    }

    capturePowerStrike() {
      inspecting = true;
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

    advance(seconds: number) {
      inspecting = true; paused = true;
      for (let tick = 0; tick < Math.round(seconds * 60); tick++) {
        simulation.step(1 / 60);
        simulation.drainEvents().forEach(event => this.combatEvent(event));
      }
      this.drawScene();
    }

    private actorView(actor: Actor) {
      let view = this.views.get(actor.id);
      if (!view) {
        const shadow = this.add.image(actor.x, actor.y - 1, 'contact-shadow').setAlpha(0.55).setScale(actor.kind === 'boss' ? 2.1 : actor.kind === 'hero' ? 1 : 0.85);
        const sprite = this.add.image(actor.x, actor.y, `${actor.kind}-0`).setOrigin(0.5, actor.kind === 'boss' ? 82 / 96 : 40 / 48);
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
      const y = actor.y - (actor.kind === 'boss' ? 56 : actor.kind === 'hero' ? 29 : 27);
      const sprite = this.add.image(x, y, texture).setDepth(6000);
      const numbers = this.effects.filter((effect) => effect.kind === 'number');
      if (numbers.length >= 8) { numbers[0].duration = 0; }
      this.effects.push({ sprite, start: simulation.elapsed, duration: 0.7, kind: 'number', x, y, scale: power ? 1.25 : 1 });
    }

    private addEffect(kind: 'slash' | 'impact' | 'boss-impact', x: number, y: number, scale: number, angle: number) {
      const sprite = this.add.image(x, y, kind === 'boss-impact' ? 'boss-impact-0' : `combat-${kind === 'slash' ? 0 : 4}`)
        .setDepth(5500).setScale(scale).setRotation(kind === 'slash' ? angle - 0.2 : 0);
      this.effects.push({ sprite, start: simulation.elapsed, duration: kind === 'boss-impact' ? .32 : kind === 'slash' ? 0.24 : 0.2, kind, x, y, scale });
    }

    private addSparks(x: number, y: number, heal = false, count = 5) {
      for (let index = 0; index < count; index++) {
        const angle = index * 2.399 + simulation.elapsed;
        const dx = heal ? Math.sin(angle) * 5 : Math.cos(angle) * (5 + index);
        const dy = heal ? -12 - index : Math.sin(angle) * (5 + index) - 2;
        const sprite = this.add.rectangle(x, y, index % 2 ? 1 : 2, index % 2 ? 2 : 1, heal ? 0x9cfaa0 : index % 2 ? 0xffd16c : 0xff6805)
          .setDepth(5600);
        this.sparks.push({ sprite, start: simulation.elapsed, duration: heal ? 0.7 : 0.4, x, y, dx, dy });
      }
    }

    private combatEvent(event: CombatEvent) {
      if (event.type === 'save') { persist(); return; }
      if (event.type === 'respawn') { this.resetVisuals(); return; }
      if (event.type === 'death') { this.addSparks(event.x, event.y - 8, false, 7); return; }
      const target = simulation.actors.find((actor) => actor.id === event.target);
      if (!target) return;
      if (event.type === 'heal') {
        this.addNumber(target, event.amount, true, false);
        this.addSparks(target.x, target.y - 8, true, 8);
        this.actorView(target).sprite.setTint(0xa8ffbe);
        return;
      }
      this.addNumber(target, event.amount, false, event.power);
      const source = simulation.actors.find((actor) => actor.id === event.source);
      if (source?.kind === 'hero') {
        this.addEffect('slash', source.x, source.y - 13, event.power ? 0.88 : 0.53, event.angle);
        this.addEffect('impact', target.x, target.y - 12, event.power ? 0.44 : 0.26, 0);
        this.addSparks(target.x, target.y - 12, false, event.power ? 7 : 3);
      } else if (source?.kind === 'boss') {
        this.addEffect('boss-impact', target.x, target.y - 5, .8, 0);
      }
    }

    private drawScene() {
      const cam = this.cameras.main;
      const targetX = simulation.hero.x - cam.width / 2, targetY = simulation.hero.y - cam.height / 2 - Math.min(18, cam.height * .08);
      cam.setScroll(Math.round(cam.scrollX + (targetX - cam.scrollX) * .16), Math.round(cam.scrollY + (targetY - cam.scrollY) * .16));
      this.worldView?.draw(simulation, reducedMotion.matches);
      const liveIds = new Set(simulation.actors.map((actor) => actor.id));
      for (const [id, view] of this.views) {
        if (!liveIds.has(id)) { view.sprite.destroy(); view.shadow.destroy(); view.bar.destroy(); this.views.delete(id); }
      }
      for (const actor of simulation.actors) {
        const view = this.actorView(actor);
        const dead = actor.state === 'dead';
        const fade = actorOpacity(actor);
        const visible = actor.kind === 'hero' || simulation.isVisible(actor);
        view.sprite.setVisible(visible); view.shadow.setVisible(visible); view.bar.setVisible(visible);
        view.sprite.setTexture(actorTexture(actor)).setPosition(Math.round(actor.x), Math.round(actor.y))
          .setFlipX(actor.facing < 0).setDepth(actor.y).setAlpha(fade);
        if (actor.flash > 0 && actor.hp > 0) view.sprite.setTint(actor.flashKind === 'heal' ? 0xa8ffbe : 0xffc1b4);
        else view.sprite.clearTint();
        view.shadow.setPosition(Math.round(actor.x), Math.round(actor.y) - 1).setDepth(actor.y - 0.1).setAlpha(fade * 0.55);
        view.bar.clear().setDepth(5000);
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
          effect.sprite.setTexture(effect.kind === 'boss-impact' ? `boss-impact-${Math.min(3, Math.floor(progress * 4))}` : `combat-${frame}`).setAlpha(reducedMotion.matches ? 0.7 : 1);
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

      this.respawn?.setText(simulation.respawnIn > 0 ? `Respawning: ${simulation.respawnIn.toFixed(1)}s` : '').setVisible(simulation.respawnIn > 0 && simulation.mode === 'farming');
    }

    update(_time: number, delta: number) {
      if (!ready) return;
      if (!paused && !document.hidden) {
        accumulator += Math.min(delta / 1000, 0.1);
        while (accumulator >= 1 / 60) {
          const won = simulation.bossDefeated;
          simulation.step(1 / 60);
          if (!won && simulation.bossDefeated) persist();
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
      // FIT reads cached parent dimensions before refresh updates them. Read the
      // new layout first, otherwise closing Upgrades leaves a small canvas.
      game.scale.getParentBounds();
      game.scale.setGameSize(180, nativeHeight());
      sceneInstance?.cameras.main.setSize(180, nativeHeight());
    }
  });
  observer.observe(parent);

  const saveTimer = window.setInterval(persist, 1000);
  const saveOnHidden = () => { if (document.hidden) persist(); };
  document.addEventListener('visibilitychange', saveOnHidden);
  window.addEventListener('pagehide', persist);
  const controller: SceneController = {
    pause() { paused = true; },
    resume() { paused = false; accumulator = 0; },
    startOver() {
      inspecting = false; simulation.reset(); simulation.setAbility('power-strike'); paused = false;
      sceneInstance?.resetVisuals(); saves.replace(simulation.exportSave());
    },
    setAbility(ability: Ability) { simulation.setAbility(ability); persist(); },
    buyUpgrade(id: UpgradeId) { const result = simulation.buyUpgrade(id); if (result.ok) persist(); return result; },
    setFloor(id: number) { const result = simulation.setFloor(id); if (result.ok) { sceneInstance?.resetVisuals(); persist(); } return result; },
    startBoss() { const result = simulation.startBoss(); if (result.ok) { sceneInstance?.resetVisuals(); persist(); } return result; },
    leaveBoss() { simulation.leaveBoss(); sceneInstance?.resetVisuals(); persist(); },
    auto() { simulation.auto(); persist(); },
    command(order) { const result = simulation.command(order); if (result.ok) persist(); return result; },
    visitRoom(id) {
      const room = simulation.dungeon.rooms.find(r => r.id === id);
      if (!room || !simulation.roomKnown(id)) return { ok: false, reason: 'Explore this room first.' };
      const result = simulation.command({ kind: 'move', ...center(room) }); if (result.ok) persist(); return result;
    },
    setProgression(advance) { simulation.setProgression(advance); persist(); },
    getSnapshot() {
      return {
        activity: simulation.activity, notice: simulation.notice, manualOrder: Boolean(simulation.order),
        roomsCleared: simulation.roomsCleared, roomCount: simulation.combatRooms.length,
        chestsOpened: simulation.chests.filter(c => c.opened).length, chestCount: simulation.chests.length,
        advanceFloors: simulation.advanceFloors, unlockedFloor: simulation.unlockedFloor, completedRuns: simulation.completedRuns,
        map: { width: simulation.dungeon.width, height: simulation.dungeon.height, tiles: simulation.dungeon.tiles,
          explored: simulation.explored, hero: { x: simulation.hero.x, y: simulation.hero.y },
          rooms: simulation.dungeon.rooms.map(r => ({ id: r.id, name: r.name, ...center(r), kind: r.kind,
            known: simulation.roomKnown(r.id), cleared: !simulation.actors.some(a => a.kind !== 'hero' && a.room === r.id && a.hp > 0) })) },
        floor: simulation.floor, region: simulation.region, mode: simulation.mode, bossDefeated: simulation.bossDefeated,
        bossHp: simulation.actors.find(actor => actor.kind === 'boss')?.hp ?? 0, bossMaxHp: BOSS.hp,
        bossSeconds: simulation.bossSeconds, bossResult: simulation.bossResult, goldPerMinute: simulation.goldPerMinute,
        victoryReady: simulation.mode === 'victory' && (simulation.actors.find(actor => actor.kind === 'boss')?.stateTime ?? 0) >= .96,
        secondaryCooldown: simulation.cooldowns[simulation.ability === 'heal' ? 'power-strike' : 'heal'],
        secondaryMaxCooldown: simulation.ability === 'heal' ? DEMO.powerCooldown : DEMO.healCooldown,
        heroHp: simulation.hero.hp, maxHp: simulation.hero.maxHp, gold: simulation.gold,
        stats: simulation.stats, ability: simulation.ability, upgrades: simulation.upgrades,
        abilities: {
          'power-strike': { amount: simulation.stats.atk * DEMO.powerMultiplier, cooldown: DEMO.powerCooldown },
          heal: { amount: simulation.hero.maxHp * DEMO.healFraction, cooldown: DEMO.healCooldown },
        },
        respawnIn: simulation.respawnIn, saveMessage: saves.message,
        abilityCooldown: simulation.cooldowns[simulation.ability],
        abilityMaxCooldown: simulation.ability === 'heal' ? DEMO.healCooldown : DEMO.powerCooldown,
        isPaused: paused,
      };
    },
    destroy() {
      persist(); window.clearInterval(saveTimer);
      document.removeEventListener('visibilitychange', saveOnHidden); window.removeEventListener('pagehide', persist);
      observer.disconnect(); game.destroy(true);
    },
  };
  // Read-only inspection and reproducible captures are kept out of the product controls.
  if (import.meta.env.DEV) {
    Object.assign(window, { __IDLECOMBATZ__: { controller, simulation,
      capturePowerStrike: () => sceneInstance?.capturePowerStrike(),
      advance: (seconds: number) => sceneInstance?.advance(seconds),
      get scene() { return sceneInstance; },
      get ready() { return ready; },
    } });
  }
  return controller;
}
