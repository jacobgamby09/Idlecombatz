// Run only against the local development build in an isolated QA browser.
(async () => {
  const d = window.__IDLECOMBATZ__;
  if (!d?.ready) throw Error('Development scene not ready');
  const settle = () => new Promise(r => setTimeout(r, 160));
  const click = selector => { const button = document.querySelector(selector); if (!button || button.disabled) throw Error(`Unavailable: ${selector}`); button.click(); };
  const check = (condition, message) => { if (!condition) throw Error(message); };
  d.advance(0); d.simulation.reset(); d.simulation.gold = 240;
  let i = 0; while (d.controller.buyUpgrade(['atk','hp','def'][i % 3]).ok) i++;
  d.simulation.hero.hp = d.simulation.hero.maxHp;
  click('[data-panel="floors"]'); await settle();
  click('[data-floor-id="3"]'); await settle();
  check(d.controller.getSnapshot().floor === 3, 'Floor 3 travel');
  check(d.scene.children.list.some(o => o.texture?.key === 'dungeon'), 'Original environment');
  click('.bottom-nav [data-panel="boss"]'); await settle(); click('[data-action="challenge"]'); await settle();
  check(d.controller.getSnapshot().mode === 'boss', 'Boss entered');
  check(!document.querySelector('.boss-health').hidden, 'Boss HUD');
  click('[data-action="retreat"]'); await settle();
  check(d.controller.getSnapshot().bossResult === 'defeat', 'Retreat');
  d.advance(6);
  click('.bottom-nav [data-panel="boss"]'); await settle(); click('[data-action="challenge"]');
  d.advance(27); await settle();
  check(d.controller.getSnapshot().mode === 'victory', 'Victory');
  check(!document.querySelector('.victory-card').hidden, 'Victory reward card');
  check(!document.querySelector('.secondary-tile').classList.contains('locked'), 'Second slot unlocked');
  check(d.controller.getSnapshot().region === 'dungeon', 'Victory retains original room');
  click('.victory-card [data-floor-id="4"]'); d.advance(2); await settle();
  check(d.controller.getSnapshot().region === 'crypt', 'Crypt travel');
  check(d.scene.children.list.some(o => o.texture?.key === 'crypt'), 'Crypt texture');
  check(document.querySelector('.victory-card').hidden, 'Victory closes');
  click('[data-panel="floors"]'); await settle(); click('[data-floor-id="1"]'); await settle();
  check(d.controller.getSnapshot().region === 'dungeon', 'Return to original region');
  click('[data-panel="floors"]'); await settle(); click('[data-floor-id="4"]'); d.advance(2); await settle();
  // Save fixture explicitly, then the caller reloads to check the real load path.
  localStorage.setItem('idlecombatz.save', JSON.stringify(d.simulation.exportSave()));
  return { passed: 12, floor: d.controller.getSnapshot().floor, unlocked: d.controller.getSnapshot().bossDefeated,
    scrollOverflow: document.documentElement.scrollWidth > innerWidth, loadError: document.querySelector('#arena').dataset.loadError ?? null };
})()
