const { convertGif } = require('./convert_gifs');
const fs = require('fs');

const fname = process.argv[2];
const outname = fname.replace('.gif', '.spritesheet.png');

if (fs.existsSync(outname)) {
  fs.unlinkSync(outname);
}

convertGif(fname);
