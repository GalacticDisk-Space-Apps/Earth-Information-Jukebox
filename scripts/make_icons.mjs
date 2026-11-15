import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.resolve(rootDir, 'public');
const svgPath = path.resolve(publicDir, 'favicon.svg');

const targets = [
  { name: 'favicon-16.png', size: 16 },
  { name: 'favicon-32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
];

async function generateIcons() {
  console.log(`Generating icon assets from ${svgPath}...`);

  if (!fs.existsSync(svgPath)) {
    throw new Error(`Source SVG not found at ${svgPath}`);
  }

  // 1. Generate PNGs
  for (const { name, size } of targets) {
    const outPath = path.resolve(publicDir, name);
    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(outPath);
    console.log(`✓ Generated ${name} (${size}x${size})`);
  }

  // 2. Generate multi-resolution favicon.ico (16x16 and 32x32)
  const ico16 = path.resolve(publicDir, 'favicon-16.png');
  const ico32 = path.resolve(publicDir, 'favicon-32.png');
  const icoOut = path.resolve(publicDir, 'favicon.ico');

  const icoBuffer = await pngToIco([ico16, ico32]);
  fs.writeFileSync(icoOut, icoBuffer);
  console.log('✓ Generated favicon.ico (16x16 + 32x32)');

  console.log('All icons generated successfully!');
}

generateIcons().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
