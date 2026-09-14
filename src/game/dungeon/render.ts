import type Phaser from 'phaser';
import type { CombatSimulation } from '../simulation';
import { TILE, center } from './layouts';

/** Sample the generated atlas once; originals and their dimensions are retained. */
export function buildTileTextures(scene: Phaser.Scene) {
  const source = scene.textures.get('atlas-source').getSourceImage() as HTMLImageElement;
  for (let i = 0; i < 16; i++) {
    const size = i < 8 || i >= 12 ? 32 : 16;
    const t = scene.textures.createCanvas(`tile-${i}`, size, size)!;
    const ctx = t.getContext(); ctx.imageSmoothingEnabled = false;
    const x = Math.round((i % 4) * source.width / 4), y = Math.round(Math.floor(i / 4) * source.height / 4);
    const right = Math.round((i % 4 + 1) * source.width / 4), bottom = Math.round((Math.floor(i / 4) + 1) * source.height / 4);
    ctx.drawImage(source, x + 3, y + 3, right - x - 6, bottom - y - 6, 0, 0, size, size);
    // The generator returned an opaque neutral matte on the prop row. Like the
    // existing character loader, normalize its key pixels only at load time.
    if (i >= 12) {
      const pixels = ctx.getImageData(0, 0, size, size);
      for (let j = 0; j < pixels.data.length; j += 4) {
        const r = pixels.data[j], g = pixels.data[j + 1], b = pixels.data[j + 2];
        if (Math.min(r, g, b) > 145 && Math.max(r, g, b) - Math.min(r, g, b) < 24) pixels.data[j + 3] = 0;
      }
      ctx.putImageData(pixels, 0, 0);
    }
    t.refresh();
  }
}
export class DungeonView {
  private scene: Phaser.Scene;
  private floor = 0;
  private terrain: Phaser.GameObjects.Image | null = null;
  private props: Phaser.GameObjects.Image[] = [];
  private fog: Phaser.GameObjects.Graphics;
  private marker: Phaser.GameObjects.Graphics;
  private light: Phaser.GameObjects.Graphics;
  private chestViews: Phaser.GameObjects.Image[] = [];
  private stairs: Phaser.GameObjects.Image | null = null;
  constructor(scene: Phaser.Scene) {
    this.scene = scene; this.fog = scene.add.graphics().setDepth(10000);
    this.marker = scene.add.graphics().setDepth(9000); this.light = scene.add.graphics().setDepth(8000);
  }
  draw(sim: CombatSimulation, reducedMotion: boolean) {
    const d = sim.dungeon, scene = this.scene;
    if (this.floor !== sim.floor) {
      this.terrain?.destroy(); this.props.forEach(p => p.destroy()); this.props = []; this.chestViews = []; this.floor = sim.floor;
      const key = `terrain-${sim.floor}`;
      if (!scene.textures.exists(key)) {
        const t = scene.textures.createCanvas(key, d.width * TILE, d.height * TILE)!;
        const ctx = t.getContext(); ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#10101b'; ctx.fillRect(0, 0, d.width * TILE, d.height * TILE);
        const crypt = sim.region === 'crypt';
        for (let y = 0; y < d.height; y++) for (let x = 0; x < d.width; x++) {
          const i = y * d.width + x;
          const adjacent = [-1, 1, -d.width, d.width, -d.width - 1, -d.width + 1, d.width - 1, d.width + 1].some(o => d.tiles[i + o] === 1);
          if (!d.tiles[i] && !adjacent) continue;
          const gx = Math.floor(x / 2), gy = Math.floor(y / 2);
          const variant = ((gx * 13 + gy * 7) % 19) < 3 ? 1 : ((gx + gy * 3) % 29 === 0 ? 2 : 0);
          const tile = d.tiles[i] ? (crypt ? 4 : 0) + variant : (crypt ? 10 : 8) + (d.tiles[i + d.width] ? 0 : 1);
          const source = scene.textures.get(`tile-${tile}`).getSourceImage() as HTMLCanvasElement;
          if (d.tiles[i]) ctx.drawImage(source, x % 2 * TILE, y % 2 * TILE, TILE, TILE, x * TILE, y * TILE, TILE, TILE);
          else ctx.drawImage(source, x * TILE, y * TILE);
          if (!d.tiles[i]) { ctx.fillStyle = '#09081366'; ctx.fillRect(x * TILE, y * TILE, TILE, TILE); }
          if (d.tiles[i] && !d.tiles[i - d.width]) { ctx.fillStyle = '#0b091666'; ctx.fillRect(x * TILE, y * TILE, TILE, 4); }
        }
        t.refresh();
      }
      this.terrain = scene.add.image(0, 0, key).setOrigin(0).setDepth(-10);
      for (const c of sim.chests) { const p = scene.add.image(c.x, c.y + 2, 'tile-12').setOrigin(.5, .8).setDepth(c.y); this.chestViews.push(p); this.props.push(p); }
      this.stairs = scene.add.image(d.exit.x, d.exit.y, 'tile-14').setDisplaySize(32, 32).setDepth(-1); this.props.push(this.stairs);
      const entrance = scene.add.image(d.entry.x, d.entry.y + 25, 'tile-14').setRotation(Math.PI).setAlpha(.55).setDepth(-1); this.props.push(entrance);
      for (const r of d.rooms) {
        for (const x of [r.x * TILE + 8, (r.x + r.w) * TILE - 8]) {
          const p = scene.add.image(x, r.y * TILE + 5, 'tile-15').setDisplaySize(12, 24).setDepth(r.y * TILE + 6); this.props.push(p);
        }
      }
      scene.cameras.main.setBounds(0, 0, d.width * TILE, d.height * TILE);
    }
    this.chestViews.forEach((p, i) => p.setTexture(sim.chests[i].opened ? 'tile-13' : 'tile-12'));
    this.stairs?.setTint(sim.readyToExit ? 0xffe6a0 : 0x817487);
    this.marker.clear();
    const order = sim.order;
    const destination = order?.kind === 'move' ? order : order?.kind === 'chest' ? sim.chests.find(c => c.id === order.id) : order?.kind === 'enemy' ? sim.actors.find(a => a.id === order.id) : null;
    if (destination) this.marker.lineStyle(1, 0xffd16c, .8).strokeCircle(destination.x, destination.y, 10);
    this.light.clear();
    const flicker = reducedMotion ? .025 : .025 + Math.sin(sim.elapsed * 9) * .006;
    for (const r of d.rooms) for (const x of [r.x * TILE + 8, (r.x + r.w) * TILE - 8]) {
      if (!sim.isVisible({ x, y: r.y * TILE + 10 })) continue;
      for (let radius = 24; radius > 4; radius -= 5) this.light.fillStyle(0xff842d, flicker).fillCircle(x, r.y * TILE + 5, radius);
    }
    this.fog.clear();
    const cam = scene.cameras.main, x0 = Math.max(0, Math.floor(cam.scrollX / TILE) - 1), y0 = Math.max(0, Math.floor(cam.scrollY / TILE) - 1);
    for (let y = y0; y < Math.min(d.height, y0 + Math.ceil(cam.height / TILE) + 3); y++) for (let x = x0; x < Math.min(d.width, x0 + Math.ceil(cam.width / TILE) + 3); x++) {
      const i = y * d.width + x;
      if (!sim.visible.has(i)) this.fog.fillStyle(0x0d0c17, sim.explored[i] ? .72 : 1).fillRect(x * TILE, y * TILE, TILE, TILE);
    }
  }
}
export { center };
