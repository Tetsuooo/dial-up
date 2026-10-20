// Finding and loading the images of a mix.

// Where a mix's image is served from (assets/mix01/samples/some%20file.webp)
export const assetUrl = (mix, layer, filename) =>
  `assets/${mix}/${layer}/${encodeURIComponent(filename.trim())}`;

// The images of one layer of a mix, from asset-data.json. Only the names are needed here:
// the images themselves are loaded one at a time, when they are about to be shown.
export const layerFiles = (assetData, mix, layer) =>
  (assetData[mix]?.[layer] || [])
    .filter(asset => asset?.filename)
    .map(asset => ({ ...asset, filename: assetUrl(mix, layer, asset.filename) }));

// ---------------------------------------------------------------------------
// GIFs that loop forever
//
// A GIF only repeats if it says so (a "NETSCAPE2.0" block with the number of repeats). Many of the
// GIFs in the collage don't, so a plain <img> plays them once and then freezes on the last frame.
// The original site looped every GIF forever, so every GIF is fetched once, told to repeat
// forever, and each image that is shown gets its own copy (which also makes it start from frame 1).
// ---------------------------------------------------------------------------

const LOOP_FOREVER = [
  0x21, 0xff, 0x0b, // extension introducer, application extension, 11 bytes follow
  0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30, // "NETSCAPE2.0"
  0x03, 0x01, 0x00, 0x00, // 3 bytes follow: sub-block 1, repeat count 0 (= forever)
  0x00, // end of block
];

const isNetscapeLoop = (b, at) =>
  b[at] === 0x0b && b[at + 12] === 0x03 && b[at + 13] === 0x01 &&
  'NETSCAPE2.0'.split('').every((ch, i) => b[at + 1 + i] === ch.charCodeAt(0));

// The GIF's bytes with "repeat forever" set, or null if the data isn't a GIF.
export const loopGifForever = (buffer) => {
  const b = new Uint8Array(buffer);
  if (b.length < 14 || b[0] !== 0x47 || b[1] !== 0x49 || b[2] !== 0x46) return null; // "GIF"

  // header (6) + screen descriptor (7), then the global colour table if there is one
  let at = 13;
  if (b[10] & 0x80) at += 3 * (2 << (b[10] & 7));
  const afterHeader = at;

  // go through all the blocks, and set any repeat block that is already there to "forever"
  let found = false;
  while (at < b.length) {
    let end = at + 1;
    if (b[at] === 0x21) { // extension
      end = at + 2;
      if (b[at + 1] === 0xff && isNetscapeLoop(b, end)) {
        b[end + 14] = 0; // repeat count, low byte
        b[end + 15] = 0; // repeat count, high byte
        found = true;
      }
    } else if (b[at] === 0x2c) { // frame: 9 bytes, maybe a colour table, then the data
      const flags = b[at + 9];
      end = at + 10;
      if (flags & 0x80) end += 3 * (2 << (flags & 7));
      end += 1; // LZW code size
    } else {
      break; // the end of the GIF (or something unexpected)
    }
    while (end < b.length && b[end] !== 0) end += b[end] + 1; // skip the data sub-blocks
    at = end + 1;
  }
  if (found) return b;

  // none there: add one straight after the header
  const out = new Uint8Array(b.length + LOOP_FOREVER.length);
  out.set(b.subarray(0, afterHeader), 0);
  out.set(LOOP_FOREVER, afterHeader);
  out.set(b.subarray(afterHeader), afterHeader + LOOP_FOREVER.length);
  return out;
};

const isGif = url => /\.gif$/i.test(url);

const gifs = new Map(); // url -> Promise<Blob>, so each GIF is only downloaded once

// Forget the downloaded GIFs of one mix (or of all of them). Per mix, because the next mix is
// already loading by the time the previous one is taken away (index.js renderPage).
export const forgetGifs = (mix) => {
  if (!mix) return gifs.clear();
  for (const url of [...gifs.keys()]) if (url.startsWith(`assets/${mix}/`)) gifs.delete(url);
};

// A URL to put in an <img>, and a function to call when the image is gone.
const loadSource = async (url, signal) => {
  if (!isGif(url)) return { src: url, release() {} };

  let blob = gifs.get(url);
  if (!blob) {
    blob = fetch(url, { signal })
      .then(response => {
        if (!response.ok) throw new Error(`${response.status} ${url}`);
        return response.arrayBuffer();
      })
      .then(buffer => new Blob([loopGifForever(buffer) || buffer], { type: 'image/gif' }));
    gifs.set(url, blob);
    blob.catch(() => gifs.delete(url)); // a failed download can be tried again later
  }

  const src = URL.createObjectURL(await blob);
  return { src, release: () => URL.revokeObjectURL(src) };
};

// A fully loaded and decoded <img>, plus a function to call when it's no longer needed.
// Rejects if the file can't be loaded, so the caller can skip it.
export const loadImage = async (url, signal) => {
  const { src, release } = await loadSource(url, signal);
  const img = new Image();
  img.decoding = 'async';
  img.alt = '';
  img.src = src;
  try {
    await img.decode();
  } catch (err) {
    release();
    throw err;
  }
  return { img, release };
};
