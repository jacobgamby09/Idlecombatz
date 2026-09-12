export const DEMO = {
  width: 180, height: 244, heroHp: 224, heroAtk: 24, heroDef: 12,
  heroSpeed: 18, skeletonSpeed: 5.8, attackRange: 23,
  attackDuration: 0.28, hitTime: 0.12, attackInterval: 1,
  enemyAttackInterval: 1.65, enemyAtk: 6,
  respawnSeconds: 5, powerCooldown: 6, healCooldown: 10,
  powerMultiplier: 3, healFraction: 0.2,
} as const;

export const MAX_GOLD = 1_000_000_000_000;
