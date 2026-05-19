const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ICON_DIR = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(ICON_DIR, { recursive: true });

async function main() {
  for (const size of [192, 512]) {
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 37, g: 99, b: 235, alpha: 1 },
      },
    })
      .png()
      .toFile(path.join(ICON_DIR, `icon-${size}.png`));
    console.log(`Generated icon-${size}.png`);
  }
}

main().catch(console.error);
