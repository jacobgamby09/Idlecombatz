import referenceUrl from '../references/modern-pixel-reference.png';

type Ability = 'power-strike' | 'heal';
type Panel = 'hero' | 'skills' | 'upgrades' | 'boss';

interface Snapshot {
  heroHp: number;
  maxHp: number;
  gold: number;
  abilityCooldown: number;
  abilityMaxCooldown: number;
  isPaused: boolean;
}

interface SceneController {
  pause(): void;
  resume(): void;
  reset(): void;
  destroy(): void;
  setAbility(ability: Ability): void;
  getSnapshot(): Snapshot;
}

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
  const events = new AbortController();

  root.innerHTML = `
    <div class="stage">
      <section class="game-shell" aria-label="IdleCombatz dungeon">
        <header class="hud">
          <div class="hero-status">
            <button class="portrait-frame" type="button" data-panel="hero" aria-label="Inspect hero">${icon('portrait')}</button>
            <div class="health-block">
              <div class="health-meter" role="meter" aria-label="Hero health" aria-valuemin="0" aria-valuemax="892" aria-valuenow="892">
                <div class="health-fill"></div>
                <span class="health-value">892 / 892</span>
              </div>
              <span class="hero-name">Knight</span>
            </div>
          </div>
          <div class="resource-status">
            <div class="gold-value">${icon('gold')}<span data-gold>0</span></div>
            <div class="floor-value">${icon('floor')}<span>Floor 1</span></div>
          </div>
          <button class="settings-button" type="button" data-action="scene" aria-label="Scene settings">${icon('settings')}</button>
        </header>

        <div class="arena-wrap"><div id="arena" role="img" aria-label="An armored knight fighting skeletons in a torchlit dungeon"></div></div>

        <section class="ability-dock" aria-label="Equipped abilities">
          <div class="ability-entry">
            <button class="ability-tile equipped" type="button" data-panel="skills" aria-label="Power Strike equipped. Open skills">
              <span class="ability-art">${icon('power-strike', 'equipped-icon')}<span class="cooldown-shade"></span></span>
            </button>
            <span class="cooldown-value">Ready</span>
          </div>
          <div class="ability-entry locked-entry">
            <button class="ability-tile locked" type="button" data-action="locked-slot" aria-label="Ability slot two is locked">${icon('lock')}</button>
            <span class="slot-number">II</span>
          </div>
        </section>

        <div class="nav-gap" aria-hidden="true"></div>
        <nav class="bottom-nav" aria-label="Character menus">
          <button type="button" data-panel="hero" aria-expanded="false">${icon('hero')}<span>Hero</span></button>
          <button type="button" data-panel="skills" aria-expanded="false">${icon('skills')}<span>Skills</span></button>
          <button type="button" data-panel="upgrades" aria-expanded="false">${icon('upgrades')}<span>Upgrades</span></button>
          <button type="button" data-panel="boss" aria-expanded="false" class="unavailable">${icon('boss')}<span>Boss</span></button>
        </nav>

        <section class="detail-panel" aria-label="Character details" hidden>
          <header class="detail-heading"><h2></h2><button type="button" data-action="close-panel" aria-label="Close panel">×</button></header>
          <div class="detail-content"></div>
        </section>
        <div class="game-toast" role="status" hidden></div>
      </section>

      <div class="scene-utility" aria-label="Visual scene controls">
        <span class="scene-label"><span class="scene-dot"></span> VISUAL STUDY <span class="scene-version">01</span></span>
        <div class="scene-actions"><button type="button" data-action="pause">Pause</button><span aria-hidden="true">/</span><button type="button" data-action="reset">Reset</button><span aria-hidden="true">/</span><button type="button" data-action="reference">Reference</button></div>
      </div>
    </div>

    <dialog class="scene-dialog">
      <header class="detail-heading"><h2>Scene</h2><button type="button" data-action="close-dialog" aria-label="Close scene settings">×</button></header>
      <div class="dialog-body"><p>The first animated visual study. Progression, purchases and saving are not enabled.</p>
        <div class="utility-buttons"><button type="button" data-action="pause">Pause scene</button><button type="button" data-action="reset">Reset scene</button><button type="button" data-action="reference">View reference</button></div>
        <p class="subtle-note">Choose Power Strike or Heal in Skills to inspect their effects.</p>
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
    hero: () => `<div class="hero-inspection"><div class="hero-preview">${icon('portrait')}<span>Knight</span></div><dl class="hero-facts"><div><dt>Health</dt><dd data-panel-health>—</dd></div><div><dt>Attack</dt><dd>Sword</dd></div><div><dt>Combat</dt><dd>Automatic</dd></div><div><dt>Ability</dt><dd>${abilityNames[selectedAbility]}</dd></div></dl></div>`,
    skills: () => `<div class="skills-list">${(['power-strike', 'heal'] as const).map((ability) => `<button class="skill-option ${selectedAbility === ability ? 'selected' : ''}" type="button" data-ability="${ability}" aria-pressed="${selectedAbility === ability}"><span class="small-icon-frame">${icon(ability)}</span><span class="skill-copy"><strong>${abilityNames[ability]}</strong><span>${ability === 'power-strike' ? 'A powerful, sweeping sword strike.' : 'Recover health with a restorative spell.'}</span></span><span class="equipped-marker">${selectedAbility === ability ? 'Equipped' : 'Equip'}</span></button>`).join('')}</div><p class="panel-footnote">Abilities cast automatically when useful.</p>`,
    upgrades: () => `<div class="locked-feature">${icon('upgrades')}<div><h3>Grow stronger</h3><p>ATK, HP, DEF and respawn upgrades arrive with the farming prototype.</p><span class="feature-status">Not available in this visual study</span></div></div>`,
    boss: () => `<div class="locked-feature">${icon('boss')}<div><h3>The first challenge</h3><p>Defeat the first boss to unlock your second ability slot.</p><span class="feature-status">Boss encounters are coming with progression</span></div></div>`,
  };

  function openPanel(panel: Panel | null) {
    currentPanel = panel;
    detailPanel.hidden = !panel;
    root.querySelectorAll<HTMLButtonElement>('.bottom-nav [data-panel]').forEach((button) => {
      const active = button.dataset.panel === panel;
      button.classList.toggle('active', active);
      button.setAttribute('aria-expanded', String(active));
    });
    if (!panel) return;
    detailPanel.querySelector('h2')!.textContent = { hero: 'Hero', skills: 'Skills', upgrades: 'Upgrades', boss: 'Boss' }[panel];
    detailContent.innerHTML = panels[panel]();
    update();
  }

  function setAbility(ability: Ability) {
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
    root.querySelectorAll<HTMLButtonElement>('[data-action="pause"]').forEach((button) => {
      const inDialog = Boolean(button.closest('dialog'));
      button.textContent = state.isPaused ? (inDialog ? 'Play scene' : 'Play') : (inDialog ? 'Pause scene' : 'Pause');
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
      case 'locked-slot': notify('Slot II unlocks after your first boss victory.'); break;
      case 'scene': sceneDialog.showModal(); break;
      case 'close-dialog': sceneDialog.close(); break;
      case 'close-reference': referenceDialog.close(); break;
      case 'reference': sceneDialog.close(); referenceDialog.showModal(); break;
      case 'pause':
        if (controller?.getSnapshot().isPaused) controller.resume();
        else controller?.pause();
        update();
        break;
      case 'reset':
        controller?.reset();
        controller?.setAbility(selectedAbility);
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
