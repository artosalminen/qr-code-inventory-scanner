const sharp = require('sharp');
const path = require('path');

const svgPath = path.join(__dirname, '..', 'public', 'icons', 'icon.svg');
const outDir = path.join(__dirname, '..', 'public', 'icons');

async function generate() {
  await sharp(svgPath)
    .resize(192, 192)
    .png()
    .toFile(path.join(outDir, 'icon-192.png'));
  console.log('Generated icon-192.png');

  await sharp(svgPath)
    .resize(512, 512)
    .png()
    .toFile(path.join(outDir, 'icon-512.png'));
  console.log('Generated icon-512.png');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
