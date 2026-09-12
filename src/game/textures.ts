import type Phaser from 'phaser';

interface SourceFrame {
  frame: number;
  sourceRect: { x: number; y: number; width: number; height: number };
  sourcePivot: [number, number];
}
interface CharacterMetadata {
  assets: { key: string; artPixelsPerSourcePixel: number; frames: SourceFrame[] }[];
}

/** Render the original atlases to one coherent art grid; source PNGs remain unchanged. */
export function buildCharacterTextures(scene: Phaser.Scene) {
  const metadata = scene.cache.json.get('character-loading') as CharacterMetadata;
  for (const asset of metadata.assets) {
    const image = scene.textures.get(`${asset.key}-source`).getSourceImage() as HTMLImageElement;
    for (const frame of asset.frames) {
      const texture = scene.textures.createCanvas(`${asset.key}-${frame.frame}`, 48, 48)!;
      const context = texture.getContext();
      context.imageSmoothingEnabled = false;
      const { x, y, width, height } = frame.sourceRect;
      const scale = asset.artPixelsPerSourcePixel;
      context.drawImage(image, x, y, width, height,
        Math.round(24 - frame.sourcePivot[0] * scale),
        Math.round(40 - frame.sourcePivot[1] * scale),
        Math.round(width * scale), Math.round(height * scale));
      texture.refresh();
    }
  }
}

export function buildDungeonTexture(scene: Phaser.Scene) {
  const image = scene.textures.get('dungeon-source').getSourceImage() as HTMLImageElement;
  const texture = scene.textures.createCanvas('dungeon', 180, 244)!;
  const context = texture.getContext();
  context.imageSmoothingEnabled = false;
  context.drawImage(image, 0, 0, 180, 244);
  texture.refresh();
  const shadow = scene.textures.createCanvas('contact-shadow', 18, 6)!;
  const shadowContext = shadow.getContext();
  shadowContext.fillStyle = '#090914';
  [8, 14, 18, 18, 14, 8].forEach((width, y) => shadowContext.fillRect((18 - width) / 2, y, width, 1));
  shadow.refresh();
}

export function buildEffectTextures(scene: Phaser.Scene) {
  const image = scene.textures.get('combat-source').getSourceImage() as HTMLImageElement;
  const cellWidth = image.naturalWidth / 4;
  const cellHeight = image.naturalHeight / 2;
  for (let frame = 0; frame < 8; frame++) {
    const texture = scene.textures.createCanvas(`combat-${frame}`, 64, 64)!;
    const context = texture.getContext();
    context.imageSmoothingEnabled = false;
    const x = Math.round(frame % 4 * cellWidth);
    const y = Math.round(Math.floor(frame / 4) * cellHeight);
    const right = Math.round((frame % 4 + 1) * cellWidth);
    const bottom = Math.round((Math.floor(frame / 4) + 1) * cellHeight);
    context.drawImage(image, x, y, right - x, bottom - y, 0, 0, 64, 64);
    texture.refresh();
  }
}

const digits: Record<string, string[]> = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '010', '010', '010'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
  '+': ['000', '010', '111', '010', '000'],
};

export function numberTexture(scene: Phaser.Scene, value: string, color: string) {
  const key = `number-${value}-${color}`;
  if (scene.textures.exists(key)) return key;
  const texture = scene.textures.createCanvas(key, value.length * 4 + 2, 8)!;
  const context = texture.getContext();
  for (let pass = 0; pass < 2; pass++) {
    context.fillStyle = pass === 0 ? '#1b0d25' : color;
    for (let character = 0; character < value.length; character++) {
      const glyph = digits[value[character]];
      if (!glyph) continue;
      glyph.forEach((row, y) => [...row].forEach((pixel, x) => {
        if (pixel !== '1') return;
        if (pass === 0) context.fillRect(character * 4 + x, y, 3, 3);
        else context.fillRect(character * 4 + x + 1, y + 1, 1, 1);
      }));
    }
  }
  texture.refresh();
  return key;
}
