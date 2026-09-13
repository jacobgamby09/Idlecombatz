import { CombatSimulation } from '../src/game/simulation.ts';

const builds = [
  {name:'Unupgraded', order:[], ability:'power-strike'},
  {name:'Attack', order:['atk'], ability:'power-strike'},
  {name:'Mixed', order:['atk','hp','def'], ability:'power-strike'},
  {name:'Sustain', order:['hp','def'], ability:'heal'},
];
const results=[];
for (const budget of [0,120,240,480]) for (const build of builds) {
  if ((budget===0)!==(build.name==='Unupgraded')) continue;
  const runs=[];
  for (const seed of [41,7,123]) {
    const sim=new CombatSimulation(seed); sim.gold=budget;sim.setAbility(build.ability);
    let index=0;
    while(build.order.length && sim.buyUpgrade(build.order[index%build.order.length]).ok) index++;
    const spent=budget-sim.gold;
    sim.startBoss();
    while(sim.mode==='boss') {sim.step(1/60);sim.drainEvents();}
    runs.push({won:sim.bossDefeated,seconds:+sim.elapsed.toFixed(1),hp:+sim.hero.hp.toFixed(1)});
    if(seed===41) results.push({build:build.name,budget,spent,levels:sim.levels,runs});
  }
}
const floors=[];
for(const floor of [1,2,3,4]) {
  const sim=new CombatSimulation();sim.gold=240;
  let i=0;while(sim.buyUpgrade(['atk','hp','def'][i%3]).ok)i++;
  sim.hero.hp=sim.hero.maxHp; sim.bossDefeated=floor===4;sim.setFloor(floor);
  const before=sim.gold;let deaths=0;
  for(let tick=0;tick<600*60;tick++) {const heroId=sim.hero.id;sim.step(1/60);deaths+=sim.drainEvents().filter(e=>e.type==='death'&&e.target===heroId).length;}
  floors.push({floor,goldPerMinute:(sim.gold-before)/10,deaths});
}
console.log(JSON.stringify({seeds:[41,7,123],results,floors},null,2));
