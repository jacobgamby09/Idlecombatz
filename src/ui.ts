import referenceUrl from '../references/modern-pixel-reference.png';
import type { Ability, SceneController, UpgradeId } from './game/types';
import { UPGRADES, UPGRADE_IDS } from './game/progression';
import { BOSS, FLOORS } from './game/world';

type Panel = 'hero' | 'skills' | 'upgrades' | 'boss' | 'floors';

const iconOrder = [
  'portrait', 'power-strike', 'heal', 'hero',
  'skills', 'upgrades', 'boss', 'gold',
  'floor', 'settings', 'lock', 'armor',
] as const;

type IconName = (typeof iconOrder)[number];

function icon(name: IconName, className = '') {
  const index = iconOrder.indexOf(name);
  return `<span class="pixel-icon ${className}" aria-hidden="true" style="--icon-x:${(index % 4) / 3 * 100}%;--icon-y:${Math.floor(index / 4) / 2 * 100}%"></span>`;
}

const abilityNames: Record<Ability, string> = { 'power-strike': 'Power Strike', heal: 'Heal' };

export function mountUI(root: HTMLElement) {
  let controller: SceneController | null = null;
  let selectedAbility: Ability = 'power-strike';
  let currentPanel: Panel | null = null;
  let animationFrame = 0;
  let lastUpdate = 0;
  let lastCooldown = 0;
  let lastBossResult: 'victory' | 'defeat' | null = null;
  const events = new AbortController();

  root.innerHTML = `
    <div class="stage">
      <section class="game-shell" aria-label="IdleCombatz dungeon">
        <header class="hud">
          <div class="hero-status">
            <button class="portrait-frame" type="button" data-panel="hero" aria-label="Inspect hero">${icon('portrait')}</button>
            <div class="health-block">
              <div class="health-meter" role="meter" aria-label="Hero health" aria-valuemin="0" aria-valuemax="224" aria-valuenow="224">
                <div class="health-fill"></div>
                <span class="health-value">— / —</span>
              </div>
              <span class="hero-name">Knight</span>
            </div>
          </div>
          <div class="resource-status">
            <div class="gold-value">${icon('gold')}<span data-gold>0</span></div>
            <button type="button" class="floor-value" data-panel="floors" aria-label="Choose farming floor">${icon('floor')}<span data-floor>Floor 1</span><span class="floor-chevron">⌄</span></button>
          </div>
          <button class="settings-button" type="button" data-action="scene" aria-label="Game settings">${icon('settings')}</button>
        </header>

        <div class="arena-wrap"><div id="arena" role="img" aria-label="An armored knight fighting skeletons in a torchlit dungeon"></div>
          <div class="boss-health" hidden><img src="/assets/boss/portrait.png" alt=""/><div class="boss-health-copy"><div><strong>Goblin King</strong><span data-boss-time></span></div><div class="boss-meter" role="meter" aria-label="Goblin King health" aria-valuemin="0" aria-valuemax="1800"><div data-boss-fill></div><span data-boss-hp></span></div></div><button type="button" data-action="retreat" aria-label="Retreat from boss">×</button></div>
          <div class="victory-card" role="status" hidden><span class="victory-eyebrow">BOSS DEFEATED</span><strong>The crown falls.</strong><p>Slot II unlocked · Power Strike + Heal<br/>A path to the Moss Crypt is open.</p><button type="button" data-floor-id="4">Enter Moss Crypt <span>→</span></button><button type="button" class="quiet-button" data-action="stay">Keep farming here</button></div>
        </div>

        <section class="ability-dock" aria-label="Equipped abilities">
          <div class="ability-entry">
            <button class="ability-tile equipped" type="button" data-panel="skills" aria-label="Power Strike equipped. Open skills">
              <span class="ability-art">${icon('power-strike', 'equipped-icon')}<span class="cooldown-shade"></span></span>
            </button>
            <span class="cooldown-value">Ready</span>
          </div>
          <div class="ability-entry locked-entry">
            <button class="ability-tile locked secondary-tile" type="button" data-action="locked-slot" aria-label="Ability slot two is locked">${icon('lock')}</button>
            <span class="slot-number">II</span>
          </div>
        </section>

        <div class="nav-gap" aria-hidden="true"></div>
        <nav class="bottom-nav" aria-label="Character menus">
          <button type="button" data-panel="hero" aria-expanded="false">${icon('hero')}<span>Hero</span></button>
          <button type="button" data-panel="skills" aria-expanded="false">${icon('skills')}<span>Skills</span></button>
          <button type="button" data-panel="upgrades" aria-expanded="false">${icon('upgrades')}<span>Upgrades</span></button>
          <button type="button" data-panel="boss" aria-expanded="false">${icon('boss')}<span>Boss</span></button>
        </nav>

        <section class="detail-panel" aria-label="Character details" hidden>
          <header class="detail-heading"><h2></h2><button type="button" data-action="close-panel" aria-label="Close panel">×</button></header>
          <div class="detail-content"></div>
        </section>
        <div class="game-toast" role="status" hidden></div>
        <div class="save-warning" role="status" hidden></div>
      </section>

      <div class="scene-utility" aria-label="Visual scene controls">
        <span class="scene-label"><span class="scene-dot"></span> DUNGEON PROTOTYPE <span class="scene-version">03</span></span>
        <div class="scene-actions"><button type="button" data-action="pause">Pause</button><span aria-hidden="true">/</span><button type="button" data-action="scene">Settings</button><span aria-hidden="true">/</span><button type="button" data-action="reference">Reference</button></div>
      </div>
    </div>

    <dialog class="scene-dialog">
      <header class="detail-heading"><h2>Settings</h2><button type="button" data-action="close-dialog" aria-label="Close settings">×</button></header>
      <div class="dialog-body"><p>Progress saves automatically in this browser. Away time earns no rewards. Returning starts a fresh encounter with your saved health and recovery time.</p>
        <div class="utility-buttons"><button type="button" data-action="pause">Pause</button><button type="button" data-action="start-over">Start over</button><button type="button" data-action="reference">View reference</button></div>
        <div class="reset-confirm" role="group" aria-label="Confirm new game" hidden><p>Erase all gold and upgrades in this browser and start a new game?</p><div class="utility-buttons"><button type="button" data-action="confirm-reset">Erase progress & start over</button><button type="button" data-action="cancel-reset">Keep playing</button></div></div>
        <p class="subtle-note">Choose your farming floor beside the gold counter. Boss attempts start at full health; leaving or reloading an attempt counts as a defeat.</p>
      </div>
    </dialog>

    <dialog class="reference-dialog">
      <header class="detail-heading"><h2>Original reference</h2><button type="button" data-action="close-reference" aria-label="Close reference">×</button></header>
      <div class="reference-body"><img src="${referenceUrl}" alt="The original Modern Pixel art direction: violet dungeon, armored knight, skeletons, orange sword arc and compact pixel interface" /><p>Modern Pixel · supplied visual target</p></div>
    </dialog>
  `;

  const arena = root.querySelector<HTMLElement>('#arena')!;
  const detailPanel = root.querySelector<HTMLElement>('.detail-panel')!;
  const detailContent = root.querySelector<HTMLElement>('.detail-content')!;
  const healthFill = root.querySelector<HTMLElement>('.health-fill')!;
  const healthValue = root.querySelector<HTMLElement>('.health-value')!;
  const healthMeter = root.querySelector<HTMLElement>('.health-meter')!;
  const goldValue = root.querySelector<HTMLElement>('[data-gold]')!;
  const cooldownShade = root.querySelector<HTMLElement>('.cooldown-shade')!;
  const cooldownValue = root.querySelector<HTMLElement>('.cooldown-value')!;
  const equippedTile = root.querySelector<HTMLButtonElement>('.ability-tile.equipped')!;
  const toast = root.querySelector<HTMLElement>('.game-toast')!;
  const sceneDialog = root.querySelector<HTMLDialogElement>('.scene-dialog')!;
  const referenceDialog = root.querySelector<HTMLDialogElement>('.reference-dialog')!;
  let toastTimer: ReturnType<typeof setTimeout> | undefined;

  const panels: Record<Panel, () => string> = {
    hero: () => `<div class="hero-inspection"><div class="hero-preview">${icon('portrait')}<span>Knight</span></div><dl class="hero-facts"><div><dt>Health</dt><dd data-panel-health>—</dd></div><div><dt>Attack</dt><dd data-stat="atk">—</dd></div><div><dt>Defense</dt><dd data-stat="def">—</dd></div><div><dt>Respawn</dt><dd data-stat="respawn">—</dd></div></dl></div>`,
    skills: () => `<div class="skills-list">${(['power-strike', 'heal'] as const).map((ability) => `<button class="skill-option ${selectedAbility === ability ? 'selected' : ''}" type="button" data-ability="${ability}" aria-pressed="${selectedAbility === ability}"><span class="small-icon-frame">${icon(ability)}</span><span class="skill-copy"><strong>${abilityNames[ability]}</strong><span>${ability === 'power-strike' ? 'A powerful, sweeping sword strike.' : 'Recover health with a restorative spell.'}</span></span><span class="equipped-marker">${selectedAbility === ability ? 'Equipped' : 'Equip'}</span></button>`).join('')}</div><p class="panel-footnote">Abilities cast automatically when useful.</p>`,
    upgrades: () => `<div class="upgrade-list">${UPGRADE_IDS.map(id => `<div class="upgrade-row" data-upgrade-row="${id}"><span class="upgrade-symbol">${icon(id === 'atk' ? 'power-strike' : id === 'hp' ? 'heal' : id === 'def' ? 'armor' : 'hero')}</span><div class="upgrade-copy"><div><strong>${UPGRADES[id].name}</strong><span class="upgrade-level"></span></div><span class="upgrade-effect"></span><small>${UPGRADES[id].description}</small></div><button type="button" data-upgrade="${id}"><span class="upgrade-price"></span><span class="buy-label">Buy</span></button></div>`).join('')}</div>`,
    boss: () => `<div class="boss-inspection"><img src="/assets/boss/portrait.png" alt="Goblin King"/><div><h3>${BOSS.name}</h3><p>${BOSS.hp.toLocaleString('en')} HP · ${BOSS.seconds}s attempt</p><span class="boss-reward">Reward: Slot II + Moss Crypt</span></div></div><p class="boss-rules">Start at full health. Defeat the king in one attempt. Death, timeout or retreat returns you to farming; his health resets.</p><button type="button" class="primary-action" data-action="challenge">Challenge the king</button>`,
    floors: () => `<div class="floor-list">${FLOORS.map(f => `<button type="button" data-floor-id="${f.id}"><span><strong>Floor ${f.id}</strong><small>${f.name}</small></span><span>${f.reward} G / kill <small data-floor-status="${f.id}"></small></span></button>`).join('')}</div><p class="panel-footnote">Current floor: <strong data-gold-rate>0</strong> gold/min · last 60s, including recovery. Higher floors hit harder.</p>`,
  };

  function openPanel(panel: Panel | null) {
    currentPanel = panel;
    root.querySelector('.game-shell')?.classList.toggle('upgrades-open', panel === 'upgrades');
    detailPanel.hidden = !panel;
    root.querySelectorAll<HTMLButtonElement>('.bottom-nav [data-panel]').forEach((button) => {
      const active = button.dataset.panel === panel;
      button.classList.toggle('active', active);
      button.setAttribute('aria-expanded', String(active));
    });
    if (!panel) return;
    detailPanel.querySelector('h2')!.textContent = { hero: 'Hero', skills: 'Skills', upgrades: 'Upgrades', boss: 'Boss', floors: 'Farming floors' }[panel];
    detailContent.innerHTML = panels[panel]();
    update();
  }

  function setAbility(ability: Ability) {
    if (controller?.getSnapshot().mode !== 'farming') return;
    selectedAbility = ability;
    controller?.setAbility(ability);
    equippedTile.querySelector('.equipped-icon')!.outerHTML = icon(ability, 'equipped-icon');
    equippedTile.setAttribute('aria-label', `${abilityNames[ability]} equipped. Open skills`);
    lastCooldown = 0;
    if (currentPanel) {
      openPanel(currentPanel);
      detailContent.querySelector<HTMLButtonElement>(`[data-ability="${ability}"]`)?.focus({ preventScroll: true });
    }
  }

  function notify(message: string) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = setTimeout(() => { toast.hidden = true; }, 3400);
  }

  function update() {
    if (!controller) return;
    const state = controller.getSnapshot();
    root.querySelector('[data-floor]')!.textContent = state.mode === 'boss' ? 'Boss' : `Floor ${state.floor}`;
    const bossHealth = root.querySelector<HTMLElement>('.boss-health')!;
    bossHealth.hidden = state.mode !== 'boss';
    root.querySelector('[data-boss-time]')!.textContent = `${Math.ceil(state.bossSeconds)}s`;
    root.querySelector('[data-boss-hp]')!.textContent = `${Math.ceil(state.bossHp)} / ${state.bossMaxHp}`;
    root.querySelector<HTMLElement>('[data-boss-fill]')!.style.width = `${state.bossHp / state.bossMaxHp * 100}%`;
    root.querySelector('.boss-meter')!.setAttribute('aria-valuenow', String(Math.ceil(state.bossHp)));
    root.querySelector<HTMLElement>('.victory-card')!.hidden = !state.victoryReady;
    arena.setAttribute('aria-label', state.mode === 'boss' ? 'Knight fighting the Goblin King in the dungeon' : state.region === 'crypt' ? 'Knight fighting skeletons in the moss-covered crypt' : 'Knight fighting skeletons in the torchlit dungeon');
    if (state.bossResult && state.bossResult !== lastBossResult) {
      if (state.bossResult === 'defeat') notify('Attempt ended. Recover, improve your build and try again.');
      else { clearTimeout(toastTimer); toast.hidden = true; openPanel(null); root.querySelector('.secondary-tile')?.classList.add('slot-unlocked'); }
    }
    lastBossResult = state.bossResult;
    const secondary = root.querySelector<HTMLButtonElement>('.secondary-tile')!;
    const secondAbility = state.ability === 'heal' ? 'power-strike' : 'heal';
    const secondaryKey = state.bossDefeated ? secondAbility : 'lock';
    if (secondary.dataset.icon !== secondaryKey) {
      secondary.dataset.icon = secondaryKey;
      secondary.innerHTML = state.bossDefeated ? `<span class="ability-art">${icon(secondAbility)}<span class="cooldown-shade"></span></span>` : icon('lock');
      secondary.classList.toggle('locked', !state.bossDefeated);
      secondary.classList.toggle('equipped', state.bossDefeated);
      secondary.setAttribute('aria-label', state.bossDefeated ? `${abilityNames[secondAbility]} equipped. Open skills` : 'Ability slot two is locked');
    }
    const secondShade = secondary.querySelector<HTMLElement>('.cooldown-shade');
    if (secondShade) secondShade.style.height = `${state.secondaryCooldown / state.secondaryMaxCooldown * 100}%`;
    root.querySelector<HTMLElement>('.slot-number')!.textContent = state.bossDefeated ? state.secondaryCooldown > .05 ? state.secondaryCooldown.toFixed(1) : 'Ready' : 'II';
    root.querySelectorAll<HTMLButtonElement>('[data-floor-id]').forEach(button => {
      const id = Number(button.dataset.floorId);
      const locked = id === 4 && !state.bossDefeated;
      button.disabled = locked || state.mode === 'boss';
      button.classList.toggle('selected', id === state.floor);
      const status = button.querySelector('[data-floor-status]');
      if (status) status.textContent = locked ? 'Defeat the king' : id === state.floor ? 'Farming here' : 'Travel';
    });
    const rate = root.querySelector('[data-gold-rate]');
    if (rate) rate.textContent = state.goldPerMinute.toFixed(1);
    const challenge = root.querySelector<HTMLButtonElement>('[data-action="challenge"]');
    if (challenge) {
      challenge.disabled = state.mode === 'victory' || (state.mode === 'farming' && !state.bossDefeated && state.heroHp <= 0);
      challenge.textContent = state.mode === 'boss' ? 'Retreat to farming' : state.bossDefeated ? 'Enter Moss Crypt' : state.heroHp <= 0 ? 'Waiting for respawn…' : 'Challenge the king';
    }
    if (selectedAbility !== state.ability) {
      selectedAbility = state.ability;
      equippedTile.querySelector('.equipped-icon')!.outerHTML = icon(selectedAbility, 'equipped-icon');
      equippedTile.setAttribute('aria-label', `${abilityNames[selectedAbility]} equipped. Open skills`);
    }
    const hp = Math.max(0, Math.ceil(state.heroHp));
    const maxHp = Math.max(1, Math.ceil(state.maxHp));
    const healthText = `${hp} / ${maxHp}`;
    healthValue.textContent = healthText;
    healthFill.style.width = `${Math.min(100, hp / maxHp * 100)}%`;
    healthMeter.setAttribute('aria-valuenow', String(hp));
    healthMeter.setAttribute('aria-valuemax', String(maxHp));
    healthMeter.classList.toggle('low-health', hp / maxHp < 0.3);
    goldValue.textContent = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(state.gold);
    const cooldown = Math.max(0, state.abilityCooldown);
    const cooldownRatio = state.abilityMaxCooldown > 0 ? cooldown / state.abilityMaxCooldown : 0;
    cooldownShade.style.height = `${Math.min(100, cooldownRatio * 100)}%`;
    cooldownValue.textContent = cooldown > 0.05 ? `${cooldown.toFixed(1)}` : 'Ready';
    if (cooldown > lastCooldown + 0.3 && lastCooldown < 0.5) {
      equippedTile.classList.remove('just-cast');
      void equippedTile.offsetWidth;
      equippedTile.classList.add('just-cast');
    }
    lastCooldown = cooldown;
    const panelHealth = root.querySelector('[data-panel-health]');
    if (panelHealth) panelHealth.textContent = healthText;
    const attack = root.querySelector('[data-stat="atk"]');
    if (attack) attack.textContent = String(state.stats.atk);
    const defense = root.querySelector('[data-stat="def"]');
    if (defense) defense.textContent = `${state.stats.def} · ${(state.stats.def / (100 + state.stats.def) * 100).toFixed(1)}% less dmg`;
    const recovery = root.querySelector('[data-stat="respawn"]');
    if (recovery) recovery.textContent = `${state.stats.respawn.toFixed(1)}s`;
    root.querySelectorAll<HTMLElement>('.skill-copy > span').forEach(copy => {
      const ability = copy.closest<HTMLButtonElement>('[data-ability]')!.dataset.ability as Ability;
      const effect = state.abilities[ability];
      copy.textContent = `${ability === 'heal' ? `Heal ${effect.amount.toFixed(1)} HP` : `${effect.amount} damage`} · ${effect.cooldown}s cooldown`;
      const button = copy.closest<HTMLButtonElement>('[data-ability]')!;
      const equipped = state.bossDefeated || state.ability === ability;
      button.classList.toggle('selected', equipped); button.setAttribute('aria-pressed', String(equipped));
      button.disabled = state.mode !== 'farming' || state.bossDefeated;
      button.querySelector('.equipped-marker')!.textContent = equipped ? 'Equipped' : 'Equip';
    });
    for (const upgrade of state.upgrades) {
      const row = root.querySelector<HTMLElement>(`[data-upgrade-row="${upgrade.id}"]`);
      if (!row) continue;
      const format = (value: number) => upgrade.id === 'respawn' ? `${value.toFixed(1)}s` : String(value);
      row.querySelector('.upgrade-level')!.textContent = `Lv. ${upgrade.level}`;
      row.querySelector('.upgrade-effect')!.textContent = `${format(upgrade.value)} → ${format(upgrade.nextValue)}`;
      const button = row.querySelector<HTMLButtonElement>('button')!;
      button.disabled = !upgrade.affordable || state.mode !== 'farming';
      button.setAttribute('aria-label', upgrade.price === null ? `${upgrade.name}: maximum level` : `Buy ${upgrade.name} for ${upgrade.price} gold`);
      row.querySelector('.upgrade-price')!.textContent = upgrade.price === null ? 'MAX' : `${upgrade.price.toLocaleString('en')} G`;
      row.querySelector('.buy-label')!.textContent = state.mode !== 'farming' ? 'After attempt' : upgrade.price === null ? 'Complete' : upgrade.affordable ? 'Buy' : 'Need gold';
    }
    const warning = root.querySelector<HTMLElement>('.save-warning')!;
    warning.hidden = !state.saveMessage;
    warning.textContent = state.saveMessage;
    root.querySelectorAll<HTMLButtonElement>('[data-action="pause"]').forEach((button) => {
      button.textContent = state.isPaused ? 'Resume' : 'Pause';
      button.setAttribute('aria-pressed', String(state.isPaused));
    });
    root.querySelector('.scene-dot')?.classList.toggle('paused', state.isPaused);
  }

  function tick(time: number) {
    if (time - lastUpdate >= 60) {
      update();
      lastUpdate = time;
    }
    animationFrame = requestAnimationFrame(tick);
  }

  root.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>('button');
    if (!button) return;
    if (button.dataset.floorId) {
      const result = controller?.setFloor(Number(button.dataset.floorId));
      if (result?.ok) openPanel(null); else if (result) notify(result.reason);
      update(); return;
    }
    if (button.dataset.upgrade) {
      const result = controller?.buyUpgrade(button.dataset.upgrade as UpgradeId);
      if (result?.ok) {
        button.closest('.upgrade-row')?.classList.remove('purchased');
        void button.offsetWidth;
        button.closest('.upgrade-row')?.classList.add('purchased');
        notify(`${UPGRADES[button.dataset.upgrade as UpgradeId].name} upgraded`);
      } else if (result) notify(result.reason);
      update();
      return;
    }
    if (button.dataset.panel) {
      const panel = button.dataset.panel as Panel;
      openPanel(currentPanel === panel ? null : panel);
      return;
    }
    if (button.dataset.ability) {
      setAbility(button.dataset.ability as Ability);
      return;
    }
    switch (button.dataset.action) {
      case 'close-panel': openPanel(null); break;
      case 'locked-slot': if (controller?.getSnapshot().bossDefeated) openPanel('skills'); else notify('Slot II unlocks after your first boss victory.'); break;
      case 'challenge': {
        const state = controller?.getSnapshot();
        if (state?.mode === 'boss') controller?.leaveBoss();
        else if (state?.bossDefeated) controller?.setFloor(4);
        else { const result = controller?.startBoss(); if (result && !result.ok) { notify(result.reason); break; } }
        openPanel(null); update(); break;
      }
      case 'retreat': case 'stay': controller?.leaveBoss(); openPanel(null); update(); break;
      case 'scene': root.querySelector<HTMLElement>('.reset-confirm')!.hidden = true; sceneDialog.showModal(); break;
      case 'close-dialog': sceneDialog.close(); break;
      case 'close-reference': referenceDialog.close(); break;
      case 'reference': sceneDialog.close(); referenceDialog.showModal(); break;
      case 'pause':
        if (controller?.getSnapshot().isPaused) controller.resume();
        else controller?.pause();
        update();
        break;
      case 'start-over':
        root.querySelector<HTMLElement>('.reset-confirm')!.hidden = false;
        root.querySelector<HTMLButtonElement>('[data-action="cancel-reset"]')!.focus();
        break;
      case 'cancel-reset':
        root.querySelector<HTMLElement>('.reset-confirm')!.hidden = true;
        root.querySelector<HTMLButtonElement>('[data-action="start-over"]')!.focus();
        break;
      case 'confirm-reset':
        controller?.startOver();
        sceneDialog.close(); openPanel(null);
        lastCooldown = 0;
        update();
        break;
    }
  }, { signal: events.signal });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') openPanel(null);
  }, { signal: events.signal });

  [sceneDialog, referenceDialog].forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    }, { signal: events.signal });
  });

  return {
    arena,
    connect(sceneController: SceneController) {
      controller = sceneController;
      update();
      animationFrame = requestAnimationFrame(tick);
    },
    destroy() {
      events.abort();
      cancelAnimationFrame(animationFrame);
      clearTimeout(toastTimer);
    },
  };
}
