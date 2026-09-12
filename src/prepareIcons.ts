/** Normalize the supplied icon sheet into equal cells without changing its source. */
export async function prepareIcons(): Promise<void> {
  const sheet = new Image();
  sheet.src = `${import.meta.env.BASE_URL}assets/ui/icons.png`;
  await sheet.decode();

  const source = document.createElement('canvas');
  source.width = sheet.naturalWidth;
  source.height = sheet.naturalHeight;
  const sourceContext = source.getContext('2d', { willReadFrequently: true });
  if (!sourceContext) return;
  sourceContext.drawImage(sheet, 0, 0);
  const { data } = sourceContext.getImageData(0, 0, source.width, source.height);

  const atlas = document.createElement('canvas');
  atlas.width = 48 * 4;
  atlas.height = 48 * 3;
  const context = atlas.getContext('2d');
  if (!context) return;
  context.imageSmoothingEnabled = false;

  const columns = [0, 362, 724, 1086, 1448].map((x) => Math.round(x / 1448 * source.width));
  const rows = [0, 360, 690, 1086].map((y) => Math.round(y / 1086 * source.height));

  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 4; column++) {
      let left = columns[column + 1];
      let top = rows[row + 1];
      let right = -1;
      let bottom = -1;
      for (let y = rows[row]; y < rows[row + 1]; y++) {
        for (let x = columns[column]; x < columns[column + 1]; x++) {
          if (data[(y * source.width + x) * 4 + 3] <= 200) continue;
          left = Math.min(left, x);
          right = Math.max(right, x);
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
      }
      if (right < left || bottom < top) continue;
      const width = right - left + 1;
      const height = bottom - top + 1;
      const scale = Math.min(44 / width, 44 / height);
      const targetWidth = Math.max(1, Math.round(width * scale));
      const targetHeight = Math.max(1, Math.round(height * scale));
      const targetX = column * 48 + Math.floor((48 - targetWidth) / 2);
      const targetY = row * 48 + Math.floor((48 - targetHeight) / 2);
      context.drawImage(source, left, top, width, height, targetX, targetY, targetWidth, targetHeight);
    }
  }

  document.documentElement.style.setProperty('--icon-atlas', `url("${atlas.toDataURL('image/png')}")`);
}
