export const FLOORS = [
  { id: 1, regionId: 'dungeon', name: 'Dungeon I', hp: 1, damage: 1, reward: 1 },
  { id: 2, regionId: 'dungeon', name: 'Dungeon II', hp: 1.6, damage: 1.6, reward: 2 },
  { id: 3, regionId: 'dungeon', name: 'Dungeon III', hp: 2.5, damage: 2.4, reward: 4 },
  { id: 4, regionId: 'crypt', name: 'Moss Crypt', hp: 3.5, damage: 3.2, reward: 6 },
] as const;
export const BOSS = { name: 'Goblin King', hp: 1800, damage: 45, interval: 2.1,
  hitTime: .52, attackDuration: .86, range: 36, seconds: 90 } as const;
export const floorById = (id: number) => FLOORS.find(floor => floor.id === id) ?? FLOORS[0];
