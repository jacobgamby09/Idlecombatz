export const TILE = 16;
export interface Point { x: number; y: number }
export interface Room extends Point { id: number; w: number; h: number; name: string; kind: 'entry' | 'combat' | 'treasure' | 'exit' | 'boss' }
export interface Chest extends Point { id: number; room: number; opened: boolean }
export interface Dungeon { id: string; revision: number; width: number; height: number; tiles: number[]; rooms: Room[]; entry: Point; exit: Point; chests: Chest[] }
export const center = (r: Room): Point => ({ x: (r.x + Math.floor(r.w / 2)) * TILE + TILE / 2, y: (r.y + Math.floor(r.h / 2)) * TILE + TILE / 2 });
const cache = new Map<number, Dungeon>();
export function dungeonFor(floor: number): Dungeon {
  const cached = cache.get(floor); if (cached) return cached;
  const width = 37, height = 61;
  const rooms: Room[] = [
    { id: 0, x: 14, y: 52, w: 9, h: 7, name: 'The descent', kind: 'entry' },
    { id: 1, x: 14, y: 39, w: 9, h: 9, name: 'Watch chamber', kind: 'combat' },
    { id: 2, x: 14, y: 25, w: 9, h: 9, name: 'Broken hall', kind: 'combat' },
    { id: 3, x: 13, y: 10, w: 11, h: 10, name: floor === 3 ? 'The king’s chamber' : 'Last watch', kind: floor === 3 ? 'boss' : 'combat' },
    { id: 4, x: 15, y: 2, w: 7, h: 5, name: 'Stairs down', kind: 'exit' },
    { id: 5, x: 2, y: floor === 4 ? 37 : 40, w: 8, h: 7, name: 'Forgotten treasury', kind: 'treasure' },
    { id: 6, x: 27, y: floor === 2 ? 22 : 26, w: 8, h: 8, name: 'Side crypt', kind: 'combat' },
  ];
  if (floor % 2 === 0) for (const r of rooms) r.x = width - r.x - r.w;
  const tiles = Array<number>(width * height).fill(0);
  const carve = (x: number, y: number, w: number, h: number) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) tiles[yy * width + xx] = 1;
  };
  for (const r of rooms) carve(r.x, r.y, r.w, r.h);
  for (const [a, b] of [[0, 1], [1, 2], [2, 3], [3, 4], [1, 5], [2, 6]]) {
    const p = center(rooms[a]), q = center(rooms[b]);
    const ax = Math.floor(p.x / TILE), ay = Math.floor(p.y / TILE), bx = Math.floor(q.x / TILE), by = Math.floor(q.y / TILE);
    carve(Math.min(ax, bx) - 1, ay - 1, Math.abs(ax - bx) + 3, 3);
    carve(bx - 1, Math.min(ay, by) - 1, 3, Math.abs(ay - by) + 3);
  }
  const chests = [5, 6].map((room, id) => ({ id, room, ...center(rooms[room]), opened: false }));
  const dungeon: Dungeon = { id: `floor-${floor}`, revision: 1, width, height, tiles, rooms, entry: center(rooms[0]), exit: center(rooms[4]), chests };
  cache.set(floor, dungeon); return dungeon;
}
export const cell = (d: Dungeon, p: Point) => Math.floor(p.y / TILE) * d.width + Math.floor(p.x / TILE);
export const point = (d: Dungeon, i: number): Point => ({ x: (i % d.width) * TILE + TILE / 2, y: Math.floor(i / d.width) * TILE + TILE / 2 });
export function walkable(d: Dungeon, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < d.width * TILE && y < d.height * TILE && d.tiles[cell(d, { x, y })] === 1;
}
export function fits(d: Dungeon, p: Point, radius = 5): boolean {
  return [[-radius, -radius], [radius, -radius], [-radius, radius], [radius, radius]].every(([x, y]) => walkable(d, p.x + x, p.y + y));
}
export function roomAt(d: Dungeon, p: Point): Room | undefined {
  return d.rooms.find(r => p.x >= r.x * TILE && p.x < (r.x + r.w) * TILE && p.y >= r.y * TILE && p.y < (r.y + r.h) * TILE);
}
