const { GifUtil } = require('gifwrap');
const Jimp = require('jimp');
const fs = require('fs');
const chalk = require('chalk');

const convertGif = async path => {
  const outName = path.replace('.gif', '.spritesheet.png');
  const gif = await GifUtil.read(`${path}`);

  if (fs.existsSync(outName)) {
    return ({
      frames: gif.frames.length,
      offset: gif.width
    });
  }

  if (gif.frames.length > 60) {
    console.log(chalk.red(`${path} not ok -> too many frames (${gif.frames.length})`));
    throw new Error('too many frames');
  }

  const image = await Jimp.create(gif.width * gif.frames.length, gif.height);

  await Promise.all(gif.frames.map((frame, index) => {
    if (frame.disposalMethod === 1 && index > 0) {
      image.blit(GifUtil.copyAsJimp(Jimp, gif.frames[0]), index * gif.width, 0);
    }
    image.blit(GifUtil.copyAsJimp(Jimp, frame), index * gif.width + frame.xOffset, frame.yOffset);
  }));

  image.write(outName);

  return ({
    frames: gif.frames.length,
    offset: gif.width
  });
};

module.exports = {
  convertGif
};
