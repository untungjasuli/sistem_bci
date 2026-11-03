import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const inputLogo = '/workspace/logo_bci.png';
const outputDir = '/workspace/sistem_bci/static/icons';

// PWA icon sizes needed
const iconSizes = [
  72, 96, 128, 144, 152, 192, 384, 512
];

// Apple touch icon sizes
const appleIconSizes = [
  57, 60, 72, 76, 114, 120, 144, 152, 167, 180
];

async function generateIcons() {
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Generating PWA icons...');

  // Generate standard PWA icons
  for (const size of iconSizes) {
    const outputFile = path.join(outputDir, `icon-${size}x${size}.png`);
    await sharp(inputLogo)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(outputFile);
    console.log(`Generated: icon-${size}x${size}.png`);
  }

  // Generate Apple touch icons
  for (const size of appleIconSizes) {
    const outputFile = path.join(outputDir, `apple-icon-${size}x${size}.png`);
    await sharp(inputLogo)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(outputFile);
    console.log(`Generated: apple-icon-${size}x${size}.png`);
  }

  // Generate favicon.ico (multiple sizes)
  await sharp(inputLogo)
    .resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(path.join(outputDir, 'favicon-32x32.png'));

  await sharp(inputLogo)
    .resize(16, 16, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(path.join(outputDir, 'favicon-16x16.png'));

  // Generate maskable icon (for Android adaptive icons)
  await sharp(inputLogo)
    .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(path.join(outputDir, 'icon-maskable-512x512.png'));

  console.log('\nAll icons generated successfully!');
  console.log(`Output directory: ${outputDir}`);
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});