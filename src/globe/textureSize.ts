import type { Texture } from 'three';

export function limitTextureSize(texture: Texture, maxTextureSize: number) {
  const limit = Math.min(4096, maxTextureSize);
  const image = texture.image as HTMLImageElement;
  const scale = limit / Math.max(image.width, image.height);
  if (scale >= 1) return;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(image.width * scale));
  canvas.height = Math.max(1, Math.floor(image.height * scale));
  const context = canvas.getContext('2d');
  if (!context) return;

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  texture.image = canvas;
  texture.needsUpdate = true;
}
