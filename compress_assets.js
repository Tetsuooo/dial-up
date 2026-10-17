/* globals require, console, process */
// Makes the images in src/assets lighter without changing how they look on the site.
//
//   node compress_assets.js            compress everything that can be made lighter
//   node compress_assets.js --dry      only report what it would do
//   node compress_assets.js mix05      only one mix
//
// - GIFs become animated WebP: same size, same frames, same timing, repeating forever.
//   Lossless (exactly the same pixels) unless that is much bigger than high-quality lossy.
//   A GIF is only replaced when the WebP is clearly smaller and checks out.
// - Stills that are larger than they're ever shown are scaled down:
//   samples to 2048 px, mist and background to 2560 px (on the longer side).
// - Gradients and splash images are left alone.
//
// Run it after adding images, then `node read_files.js` to update asset-data.json.
// Running it again is safe: files that are already done are skipped.

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Each file is read into memory first and sharp's cache is off, so no file stays open
// (on Windows an open file can't be replaced or deleted)
sharp.cache(false);

const ROOT = 'src/assets';
const DRY = process.argv.includes('--dry');
const ONLY = process.argv.slice(2).filter(a => a.startsWith('mix'));
const LOG = (process.argv.find(a => a.startsWith('--log=')) || '').slice(6); // optional: write the details to this JSON file

const MAX_SIDE = { samples: 2048, mist: 2560, background: 2560 };
const LOSSY = { quality: 80, effort: 4, loop: 0 };
const LOSSLESS = { lossless: true, effort: 4, loop: 0 };
const PREFER_LOSSLESS_UP_TO = 1.25; // lossless if it's at most 25% bigger than lossy
const MIN_SAVING = 0.9;             // only replace a file if the new one is at most 90% of its size

// Browsers play GIF frames that ask for 0 - 10 ms at 100 ms, so that's what has to stay the same
const playedMs = delays => (delays || []).reduce((sum, d) => sum + (d <= 10 ? 100 : d), 0);

const report = { gif: { done: 0, kept: 0, before: 0, after: 0 }, still: { done: 0, before: 0, after: 0 }, kept: [], files: [] };

// Replace a file safely: write the new one next to it first, then swap
const writeSafely = (target, buffer) => {
  const tmp = `${target}.tmp`;
  fs.writeFileSync(tmp, buffer);
  fs.renameSync(tmp, target);
};

async function compressGif(data) {
  const input = { animated: true, limitInputPixels: false };
  const src = await sharp(data, input).metadata();
  const [lossy, lossless] = await Promise.all([
    sharp(data, input).webp(LOSSY).toBuffer(),
    sharp(data, input).webp(LOSSLESS).toBuffer(),
  ]);
  const out = lossless.length <= lossy.length * PREFER_LOSSLESS_UP_TO ? lossless : lossy;
  const before = data.length;
  if (out.length > before * MIN_SAVING) return { keep: 'not smaller' };

  // check the result: same size, same frames (identical neighbours may be merged), same timing
  const res = await sharp(out, { animated: true }).metadata();
  const srcH = src.pageHeight || src.height;
  const resH = res.pageHeight || res.height;
  if (res.width !== src.width || resH !== srcH) return { keep: `size changed ${src.width}x${srcH} -> ${res.width}x${resH}` };
  if ((src.pages || 1) > 1) {
    if ((res.pages || 1) < 2) return { keep: 'lost its animation' };
    const a = playedMs(src.delay);
    const b = (res.delay || []).reduce((s, d) => s + d, 0);
    if (Math.abs(a - b) > Math.max(50, a * 0.05)) return { keep: `timing changed ${a} -> ${b} ms` };
  }
  return { buffer: out, before, lossless: out === lossless };
}

async function compressStill(data, maxSide) {
  const meta = await sharp(data, { limitInputPixels: false }).metadata();
  if ((meta.pages || 1) > 1 || Math.max(meta.width, meta.height) <= maxSide) return null;
  const out = await sharp(data, { limitInputPixels: false })
    .resize({ width: maxSide, height: maxSide, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();
  return out.length <= data.length * MIN_SAVING ? { buffer: out, before: data.length } : null;
}

(async () => {
  const mixes = fs.readdirSync(ROOT).filter(m => m.startsWith('mix') && (!ONLY.length || ONLY.includes(m)));
  for (const mix of mixes) {
    for (const layer of fs.readdirSync(path.join(ROOT, mix))) {
      const dir = path.join(ROOT, mix, layer);
      if (!fs.statSync(dir).isDirectory() || layer === 'gradient' || layer === 'splash') continue;
      for (const name of fs.readdirSync(dir)) {
        const file = path.join(dir, name);
        try {
          if (/\.gif$/i.test(name)) {
            const target = path.join(dir, name.replace(/\.gif$/i, '.webp'));
            if (fs.existsSync(target)) { report.kept.push(`${file}: ${path.basename(target)} already exists`); continue; }
            const r = await compressGif(fs.readFileSync(file));
            if (r.keep) { report.gif.kept++; report.kept.push(`${file}: ${r.keep}`); continue; }
            if (!DRY) {
              writeSafely(target, r.buffer);
              try {
                fs.unlinkSync(file);
              } catch (err) {
                fs.unlinkSync(target); // keep things as they were rather than having both
                throw err;
              }
            }
            report.gif.done++; report.gif.before += r.before; report.gif.after += r.buffer.length;
            report.files.push({ from: file, to: target, before: r.before, after: r.buffer.length, lossless: r.lossless });
          } else if (/\.webp$/i.test(name) && MAX_SIDE[layer]) {
            const r = await compressStill(fs.readFileSync(file), MAX_SIDE[layer]);
            if (!r) continue;
            if (!DRY) writeSafely(file, r.buffer);
            report.still.done++; report.still.before += r.before; report.still.after += r.buffer.length;
            report.files.push({ from: file, to: file, before: r.before, after: r.buffer.length, resized: true });
          }
        } catch (err) {
          report.kept.push(`${file}: ${err.message.split('\n')[0]}`);
        }
      }
    }
    process.stdout.write(`${mix} `);
  }
  const mb = b => (b / 1e6).toFixed(1) + ' MB';
  console.log(`\n\n${DRY ? 'Would compress' : 'Compressed'}:`);
  console.log(`  GIFs -> WebP:   ${report.gif.done} files, ${mb(report.gif.before)} -> ${mb(report.gif.after)}`);
  console.log(`  smaller stills: ${report.still.done} files, ${mb(report.still.before)} -> ${mb(report.still.after)}`);
  if (report.kept.length) {
    console.log(`\nLeft as they were (${report.kept.length}):`);
    report.kept.forEach(k => console.log('  ' + k));
  }
  if (LOG) fs.writeFileSync(LOG, JSON.stringify(report, null, 1));
  if (!DRY) console.log('\nNow run: node read_files.js');
})();
