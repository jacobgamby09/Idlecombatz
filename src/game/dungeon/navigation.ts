import { cell, point, TILE, walkable } from './layouts.ts';
import type { Dungeon, Point } from './layouts.ts';
export function neighbors(d: Dungeon, i: number): number[] {
  const x = i % d.width, y = Math.floor(i / d.width);
  return [y > 0 ? i - d.width : -1, x > 0 ? i - 1 : -1, x < d.width - 1 ? i + 1 : -1, y < d.height - 1 ? i + d.width : -1].filter(n => n >= 0 && d.tiles[n] === 1);
}
export function route(d: Dungeon, from: Point, to: Point, known?: number[]): Point[] {
  const start = cell(d, from), end = cell(d, to);
  if (!walkable(d, to.x, to.y) || (known && !known[end])) return [];
  const queue = [start], prev = new Int32Array(d.tiles.length).fill(-1); prev[start] = start;
  for (let i = 0; i < queue.length && prev[end] === -1; i++) {
    for (const n of neighbors(d, queue[i])) if (prev[n] === -1 && (!known || known[n])) { prev[n] = queue[i]; queue.push(n); }
  }
  if (prev[end] === -1) return [];
  const path: Point[] = [point(d, end)];
  for (let i = end; i !== start;) { i = prev[i]; path.push(point(d, i)); }
  return path.reverse();
}
export function sight(d: Dungeon, a: Point, b: Point, revealWall = false): boolean {
  let x = Math.floor(a.x / TILE), y = Math.floor(a.y / TILE);
  const endX = Math.floor(b.x / TILE), endY = Math.floor(b.y / TILE);
  const dx = b.x - a.x, dy = b.y - a.y, sx = Math.sign(dx), sy = Math.sign(dy);
  const tx = dx ? TILE / Math.abs(dx) : Infinity, ty = dy ? TILE / Math.abs(dy) : Infinity;
  let nextX = dx ? ((sx > 0 ? x + 1 : x) * TILE - a.x) / dx : Infinity;
  let nextY = dy ? ((sy > 0 ? y + 1 : y) * TILE - a.y) / dy : Infinity;
  const open = (xx: number, yy: number) => xx >= 0 && yy >= 0 && xx < d.width && yy < d.height && d.tiles[yy * d.width + xx] === 1;
  for (let step = 0; step <= d.width + d.height; step++) {
    if (x === endX && y === endY) return true;
    if (Math.abs(nextX - nextY) < 1e-9) {
      // Supercover at a corner: touching a wall blocks vision and melee too.
      if (!open(x + sx, y) || !open(x, y + sy)) return false;
      x += sx; y += sy; nextX += tx; nextY += ty;
    } else if (nextX < nextY) { x += sx; nextX += tx; }
    else { y += sy; nextY += ty; }
    if (!open(x, y)) return revealWall && x === endX && y === endY;
  }
  return false;
}
export function reveal(d: Dungeon, hero: Point, explored: number[]): Set<number> {
  const visible = new Set<number>(), cx = Math.floor(hero.x / TILE), cy = Math.floor(hero.y / TILE);
  for (let y = Math.max(0, cy - 7); y <= Math.min(d.height - 1, cy + 7); y++) {
    for (let x = Math.max(0, cx - 7); x <= Math.min(d.width - 1, cx + 7); x++) {
      const i = y * d.width + x;
      if (Math.hypot(x - cx, y - cy) <= 7 && sight(d, hero, point(d, i), true)) { visible.add(i); explored[i] = 1; }
    }
  }
  return visible;
}
