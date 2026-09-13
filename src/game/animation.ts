import type { Actor } from './simulation.ts';

/** Visual clips never change simulation state or delay the next attack. */
export function actorTexture(actor: Actor): string {
  const boss = actor.kind === 'boss';
  if (actor.state === 'dead') return boss
    ? `boss-${18 + Math.min(5, Math.floor(actor.stateTime / .16))}`
    : `${actor.kind}-extra-${2 + Math.min(3, Math.floor(actor.stateTime / .14))}`;
  if (actor.state === 'attack') {
    const t = actor.stateTime;
    const frame = boss ? (t < .12 ? 12 : t < .26 ? 13 : t < .40 ? 14 : t < .52 ? 15 : t < .68 ? 16 : 17)
      : (t < .065 ? 8 : t < .12 ? 9 : t < .195 ? 10 : 11);
    return `${actor.kind}-${frame}`;
  }
  if (actor.flash > 0 && actor.flashKind === 'hit') return boss
    ? `boss-${actor.flash > .04 ? 4 : 5}` : `${actor.kind}-extra-${actor.flash > .04 ? 0 : 1}`;
  if (actor.state === 'walk') {
    const step = Math.floor(actor.stateTime * (boss ? 6 : 9)) % 4;
    return `${actor.kind}-${boss ? [6, 10, 8, 9][step] : 4 + step}`;
  }
  return `${actor.kind}-${Math.floor((actor.stateTime + actor.id * .17) * 4) % 4}`;
}

export function actorOpacity(actor: Actor) {
  if (actor.state !== 'dead') return Math.min(1, actor.spawnTime / .2);
  const hold = actor.kind === 'boss' ? .96 : .56;
  return Math.max(0, Math.min(1, 1 - (actor.stateTime - hold) / .19));
}
