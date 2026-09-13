// Browser regression: run on a loaded game with agent-browser eval --stdin.
// Exercises actual panel layout in both paused and running combat. No save reset.
(async () => {
  const root = document.querySelector('.game-shell');
  const pause = document.querySelector('[data-action="pause"]');
  const upgrades = document.querySelector('.bottom-nav [data-panel="upgrades"]');
  if (!root || !pause || !upgrades || !document.querySelector('#arena canvas')) throw Error('Game not ready');
  const wasPaused = pause.getAttribute('aria-pressed') === 'true';
  const wasOpen = root.classList.contains('upgrades-open');
  const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 100))));
  const results = [];
  const setPaused = async value => {
    if ((pause.getAttribute('aria-pressed') === 'true') !== value) pause.click();
    await settle();
  };
  const setOpen = async value => {
    if (root.classList.contains('upgrades-open') !== value) upgrades.click();
    await settle();
  };
  function measure(label) {
    const arena = document.querySelector('#arena');
    const canvas = arena.querySelector('canvas');
    const shown = canvas.getBoundingClientRect();
    const bounds = arena.getBoundingClientRect();
    const scale = Math.min(bounds.width / canvas.width, bounds.height / canvas.height);
    const error = Math.max(Math.abs(shown.width - canvas.width * scale), Math.abs(shown.height - canvas.height * scale));
    const centerError = Math.max(Math.abs(shown.x + shown.width / 2 - bounds.x - bounds.width / 2),
      Math.abs(shown.y + shown.height / 2 - bounds.y - bounds.height / 2));
    if (error > 1 || centerError > 1) throw Error(`${label}: canvas size error ${error.toFixed(2)}px, center error ${centerError.toFixed(2)}px`);
    results.push({ label, error: +error.toFixed(3), centerError: +centerError.toFixed(3) });
  }
  try {
    for (const paused of [true, false]) {
      await setPaused(paused);
      for (let cycle = 1; cycle <= 4; cycle++) {
        await setOpen(true); measure(`${paused ? 'paused' : 'running'} open ${cycle}`);
        await setOpen(false); measure(`${paused ? 'paused' : 'running'} close ${cycle}`);
      }
    }
    return { viewport: [innerWidth, innerHeight], passed: results.length, results };
  } finally {
    await setOpen(wasOpen);
    await setPaused(wasPaused);
  }
})()
