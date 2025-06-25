/* globals require, console */
const fs      = require('fs').promises;
const { exec } = require('child_process');
const chalk   = require('chalk');
const Promise = require('bluebird');
const _       = require('lodash');
const path    = require('path');

// JSON file where asset data is written
const ASSET_DATA = 'src/assets/asset-data.json';

// ────────────────────────────────────────────────────────────────────────────────
// Convert an image to WebP using ImageMagick
// ────────────────────────────────────────────────────────────────────────────────
const convertToWebP = (inputPath, outputPath) =>
  new Promise((resolve, reject) => {
    /* use `magick` so Windows doesn't call its own `convert.exe` */
    exec(`magick "${inputPath}" "${outputPath}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error converting ${inputPath} to WebP:`, stderr);
        return reject(error);
      }
      resolve(outputPath);
    });
  });

// ────────────────────────────────────────────────────────────────────────────────
// Safely read one mix/layer folder and return an array of asset objects
// ────────────────────────────────────────────────────────────────────────────────
const readFolderSafe = async (mix, layer) => {
  const folderPath = `src/assets/${mix}/${layer}`;

  /* Skip if the layer folder doesn't exist */
  try {
    await fs.access(folderPath);
  } catch {
    console.log(chalk.red(`:: WARNING could not access folder ${folderPath}`));
    return [];
  }

  const files            = await fs.readdir(folderPath);
  const transformedFiles = files.sort().reverse();   // newest-looking first

  // ── 1. Handle PNG / JPG / JPEG → convert to WebP
  const rasterFiles = transformedFiles.filter(f =>
    (f.toLowerCase().endsWith('.png')  && !f.toLowerCase().endsWith('.spritesheet.png')) ||
     f.toLowerCase().endsWith('.jpg')  ||
     f.toLowerCase().endsWith('.jpeg')
  );

  const processedImages = await Promise.map(rasterFiles, async file => {
    const inputFile    = path.join(folderPath, file);
    const webpFilename = file.replace(/\.(png|jpe?g)$/i, '.webp');
    const outputFile   = path.join(folderPath, webpFilename);

    try {
      await convertToWebP(inputFile, outputFile);
      await fs.unlink(inputFile);  // delete original
      console.log(chalk.green(`Converted ${file} → ${webpFilename} and deleted original.`));
      return { filename: webpFilename, type: 'static' };
    } catch {
      console.log(chalk.red(`Failed to convert ${file}. Keeping original.`));
      return { filename: file, type: 'static' };
    }
  });

  // ── 2. Handle GIFs (no conversion)
  const processedGifs = transformedFiles
    .filter(f => f.toLowerCase().endsWith('.gif'))
    .map(  f => ({ filename: f, type: 'static' }) );

  // ── 3. Handle existing WebP files that were already in the folder
  const newlyGenerated = new Set(processedImages.map(obj => obj.filename.toLowerCase()));

  const processedWebps = transformedFiles
    .filter(f => f.toLowerCase().endsWith('.webp') && !newlyGenerated.has(f.toLowerCase()))
    .map(  f => ({ filename: f, type: 'static' }) );

  // ── 4. Return combined list
  return [...processedImages, ...processedGifs, ...processedWebps];
};

// ────────────────────────────────────────────────────────────────────────────────
// Walk every mix folder and build the nested object
// ────────────────────────────────────────────────────────────────────────────────
const getMixFiles = async () => {
  const mixFolders = await fs.readdir('src/assets');
  const result     = {};

  const mixes = mixFolders.filter(folder => folder.startsWith('mix'));

  await Promise.map(mixes, async mix => {
    const layerDirs = await fs.readdir(`src/assets/${mix}`, { withFileTypes: true });
    const layers    = layerDirs.filter(l => l.isDirectory()).map(l => l.name);

    const layerObj = {};

    await Promise.map(layers, async layer => {
      layerObj[layer] = await readFolderSafe(mix, layer);
    });

    result[mix] = layerObj;
  });

  return result;
};

// ────────────────────────────────────────────────────────────────────────────────
// Run the whole thing
// ────────────────────────────────────────────────────────────────────────────────
(async () => {
  try {
    const files = await getMixFiles();
    await fs.writeFile(ASSET_DATA, JSON.stringify(files, null, 2));
    console.log(chalk.green('Asset data written successfully.'));
  } catch (err) {
    console.error(chalk.red('Error processing mix files:'), err);
  }
})();
