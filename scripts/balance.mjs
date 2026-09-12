import { CombatSimulation } from '../src/game/simulation.ts';

const strategies = {
  Baseline: { ability: 'power-strike', order: [] },
  'Baseline Heal': { ability: 'heal', order: [] },
  Offense: { ability: 'power-strike', order: ['atk'] },
  Sustain: { ability: 'heal', order: ['hp', 'def'] },
  Mixed: { ability: 'power-strike', order: ['atk', 'hp', 'def'] },
};
function run(name, budget, seed, seconds = 600, progressive = false) {
  const sim = new CombatSimulation(seed); const strategy = strategies[name];
  sim.setAbility(strategy.ability); sim.gold = budget;
  let index = 0, buys = 0, firstBuy = null;
  const purchase = () => {
    if (!strategy.order.length) return;
    while (sim.buyUpgrade(strategy.order[index % strategy.order.length]).ok) {
      index++; buys++; firstBuy ??= sim.elapsed;
    }
  };
  if (!progressive) { purchase(); sim.hero.hp = sim.hero.maxHp; }
  const spent = budget - sim.gold;
  let alive = 0, kills = 0, deaths = 0, lifetime = 0, completedLife = 0, minHp = sim.hero.hp;
  let incoming = 0, healing = 0;
  for (let tick = 0; tick < seconds * 60; tick++) {
    if (progressive) purchase();
    if (sim.hero.hp > 0) { alive++; lifetime += 1 / 60; }
    const heroId = sim.hero.id; sim.step(1 / 60);
    for (const event of sim.drainEvents()) {
      if (event.type === 'hit' && event.target === heroId) incoming += event.amount;
      if (event.type === 'heal') healing += event.amount;
      if (event.type === 'death') {
        if (event.target === heroId) { deaths++; completedLife += lifetime; lifetime = 0; } else kills++;
      }
    }
    minHp = Math.min(minHp, sim.hero.hp);
  }
  return { build: name, budget, seed, spent: progressive ? kills - sim.gold : spent,
    goldPerMinute: +(kills / (seconds / 60)).toFixed(2), uptime: +(alive / (seconds * 60) * 100).toFixed(2),
    deaths, meanCompletedLife: deaths ? +(completedLife / deaths).toFixed(1) : null,
    minHp: +minHp.toFixed(1), incomingPerSecond: +(incoming / seconds).toFixed(2), healingPerSecond: +(healing / seconds).toFixed(2),
    levels: sim.levels, buys, firstBuy: firstBuy === null ? null : +firstBuy.toFixed(2) };
}
const seeds = [41, 7, 123];
const results = [];
for (const budget of [0, 60, 120, 240]) for (const name of Object.keys(strategies)) {
  if ((budget === 0) !== name.startsWith('Baseline')) continue;
  const runs = seeds.map(seed => run(name, budget, seed));
  results.push({ build: name, budget, spent: runs[0].spent, levels: runs[0].levels,
    goldPerMinute: +(runs.reduce((s, r) => s + r.goldPerMinute, 0) / runs.length).toFixed(2),
    uptime: +(runs.reduce((s, r) => s + r.uptime, 0) / runs.length).toFixed(2),
    deaths: runs.map(r => r.deaths), meanCompletedLife: runs.map(r => r.meanCompletedLife) });
}
console.log(JSON.stringify({ seconds: 600, seeds, results,
  progression: ['Offense', 'Sustain', 'Mixed'].map(name => run(name, 0, 41, 600, true)),
  extendedSustain: seeds.map(seed => run('Sustain', 60, seed, 1800)),
}, null, 2));
