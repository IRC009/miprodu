const path = require('path');
const sharp = require('../landing-page/node_modules/sharp');

const inputPath = path.join(__dirname, 'assets/splash-image.png');
const outputPath = path.join(__dirname, 'assets/android-icon-foreground.png');

sharp(inputPath)
  .resize(600, 600, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 }
  })
  .extend({
    top: 212,
    bottom: 212,
    left: 212,
    right: 212,
    background: { r: 0, g: 0, b: 0, alpha: 0 }
  })
  .toFile(outputPath)
  .then(() => {
    console.log('Successfully scaled and padded android-icon-foreground.png to Android safe zone (1024x1024)!');
  })
  .catch(err => {
    console.error('Error resizing icon:', err);
  });
