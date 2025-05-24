/* globals require, console */
const fs = require('fs').promises;
const { exec } = require('child_process');
const chalk = require('chalk');
const Promise = require('bluebird');
const _ = require('lodash');
const path = require('path');

// JSON file where asset data is written
const ASSET_DATA = 'src/assets/asset-data.json';

// Function to convert an image to WebP using ImageMagick
const convertToWebP = (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    // Using 'magick' so that Windows doesn't call its built-in convert command.
    exec(`magick "${inputPath}" "${outputPath}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error converting ${inputPath} to WebP:`, stderr);
        return reject(error);
      }
      resolve(outputPath);
    });
  });
};

const readFolderSafe = async (mix, layer) => {
  const folderPath = `src/assets/${mix}/${layer}`;
  try {
    await fs.access(folderPath);
  } catch (e) {
    console.log(chalk.red(`:: WARNING could not access folder ${folderPath}`));
    return [];
  }

  const files = await fs.readdir(folderPath);
  const transformedFiles = files.sort().reverse();

  // Process PNG (excluding spritesheet), JPG and JPEG files.
  // These will be converted to WebP; upon successful conversion, the old file is deleted.
  const imageFiles = transformedFiles.filter(file => (
    (file.toLowerCase().endsWith('.png') && !file.toLowerCase().endsWith('.spritesheet.png')) ||
    file.toLowerCase().endsWith('.jpg') ||
    file.toLowerCase().endsWith('.jpeg')
  ));

  const processedImages = await Promise.map(imageFiles, async file => {
    const inputFile = path.join(folderPath, file);
    const webpFilename = file.replace(/\.(png|jpg|jpeg)$/i, '.webp');
    const outputFile = path.join(folderPath, webpFilename);
    try {
      await convertToWebP(inputFile, outputFile);
      // Remove the original file after a successful conversion:
      await fs.unlink(inputFile);
      console.log(chalk.green(`Converted ${file} to ${webpFilename} and deleted original.`));
      return { filename: webpFilename, type: 'static' };
    } catch (e) {
      console.log(chalk.red(`Failed to convert ${file}. Keeping original file.`));
      return { filename: file, type: 'static' };
    }
  });

  // Process GIF files: simply add them as static objects without any conversion.
  const gifFiles = transformedFiles.filter(file => file.toLowerCase().endsWith('.gif'));
  const processedGifs = gifFiles.map(file => ({
    filename: file,
    type: 'static'
  }));

  // Combine the results and return the list.
  return [...processedImages, ...processedGifs];
};

const getMixFiles = async () => {
  const mixFolders = await fs.readdir('src/assets');
  const mixObject = {};
  // Only process folders that start with "mix"
  const transformedMixFolders = mixFolders.filter(folder => folder.startsWith('mix'));

  await Promise.map(transformedMixFolders, async mix => {
    const layers = await fs.readdir(`src/assets/${mix}`, { withFileTypes: true });
    const transformedLayers = layers.filter(layer => layer.isDirectory()).map(layer => layer.name);
    const layerObject = {};

    await Promise.map(transformedLayers, async layer => {
      const layerFilesArray = await readFolderSafe(mix, layer);
      layerObject[layer] = layerFilesArray;
    });

    mixObject[mix] = layerObject;
  });

  return mixObject;
};

(async () => {
  try {
    const files = await getMixFiles();
    await fs.writeFile(ASSET_DATA, JSON.stringify(files, null, 2));
    console.log(chalk.green('Asset data written successfully.'));
  } catch (err) {
    console.error(chalk.red('Error processing mix files:'), err);
  }
})();
