/* globals require, process, console */
// Opens every mix in a real (headless) browser and checks that it works:
// the gradient, the background, the mist and the samples load, the splash panel and the
// sc / bc buttons are there (as in artist-links.json), the player and the < > buttons are there,
// and there are no errors or failed downloads.
//
//   node tools/check-mixes.cjs https://dial-up.modemodemodem.xyz     the live site
//   node tools/check-mixes.cjs http://localhost:5306                 a local build (tools/serve.cjs)
//   node tools/check-mixes.cjs http://localhost:5306 5 12            only mixes 5 to 12
//
// Needs Playwright, which isn't installed in this repo. Point NODE_PATH at a node_modules that has
// it, e.g. in PowerShell:  $env:NODE_PATH = 'E:\ART\websites\driftweb\node_modules'
// It uses Playwright's own Chromium: on this computer the normal Chrome / Edge get closed after
// about 10 seconds when started this way.

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const repo = path.join(__dirname, '..');
const [base = 'https://dial-up.modemodemodem.xyz', from = '1', to = '40', concurrency = '3'] = process.argv.slice(2);
const read = file => JSON.parse(fs.readFileSync(path.join(repo, file), 'utf8'));
const assetData = read('src/assets/asset-data.json');
const artistLinks = read('src/artist-links.json');
const maxImages = +(fs.readFileSync(path.join(repo, 'src/layers/settings.js'), 'utf8').match(/maxImages:\s*(\d+)/) || [0, 16])[1];
const external = /soundcloud|bandcamp|sndcdn/; // not loaded during the check

async function checkMix(browser, n) {
  const mix = 'mix' + String(n).padStart(2, '0');
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  await context.route(external, route => route.abort());
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', e => problems.push('error: ' + e.message.split('\n')[0]));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) problems.push('console: ' + m.text().slice(0, 140)); });
  page.on('response', r => { if (r.status() >= 400 && !external.test(r.url())) problems.push(`HTTP ${r.status()}: ` + decodeURIComponent(r.url()).slice(-70)); });

  await page.goto(`${base}/#${mix}`, { waitUntil: 'domcontentloaded' });
  const files = layer => (assetData[mix]?.[layer] || []).length;
  await page.waitForFunction(() => document.querySelectorAll('img[data-file-id]').length >= 1, null, { timeout: 15000 })
    .catch(() => { if (files('samples')) problems.push('no sample appeared within 15 s'); });
  await page.waitForTimeout(3000);

  const r = await page.evaluate(() => {
    const ok = img => img.complete && img.naturalWidth > 0;
    const all = s => [...document.querySelectorAll(s)];
    return {
      layers: all('.dom-visual-layer').length,
      gradient: all('img[data-layer-type="gradient"]').map(ok),
      background: all('img[data-layer-type="background"]').map(ok),
      mist: all('img[data-layer-type="mist"]').map(ok),
      samples: all('img[data-file-id]').map(ok),
      splash: all('.dom-splash-panel img').map(ok),
      social: all('.social-button').map(b => b.dataset.type).sort().join(),
      player: !!document.querySelector('svg polygon'),
      nav: all('button').filter(b => ['<', '>'].includes(b.textContent)).length,
    };
  });

  const loaded = list => list.filter(Boolean).length;
  if (files('gradient') && (r.gradient.length !== 1 || !r.gradient[0])) problems.push('gradient missing');
  for (const layer of ['background', 'mist']) {
    const want = Math.min(maxImages, files(layer));
    if (r[layer].length !== want || loaded(r[layer]) !== want) problems.push(`${layer}: ${loaded(r[layer])}/${want} loaded`);
  }
  if (files('samples') && (!r.samples.length || loaded(r.samples) !== r.samples.length)) problems.push(`samples: ${loaded(r.samples)}/${r.samples.length} loaded`);
  if (files('splash') && (r.splash.length !== 1 || !r.splash[0])) problems.push('splash image missing');
  const links = artistLinks[mix] || {};
  const wantSocial = [links.bandcamp && 'bc', links.soundcloud && 'sc'].filter(Boolean).sort().join();
  if (r.social !== wantSocial) problems.push(`sc/bc buttons "${r.social}", expected "${wantSocial}"`);
  if (!r.player || r.nav !== 2) problems.push('player or < > buttons missing');
  if (r.layers !== 4) problems.push(`${r.layers} image layers instead of 4`);

  await context.close();
  return { mix, problems, counts: `samples ${r.samples.length}, background ${r.background.length}, mist ${r.mist.length}` };
}

(async () => {
  const browser = await chromium.launch();
  const queue = [];
  for (let n = +from; n <= +to; n++) queue.push(n);
  const results = [];
  await Promise.all(Array.from({ length: +concurrency }, async () => {
    while (queue.length) results.push(await checkMix(browser, queue.shift()));
  }));
  await browser.close();
  results.sort((a, b) => a.mix.localeCompare(b.mix));
  for (const r of results) console.log(`${r.problems.length ? 'FAIL' : 'OK  '} ${r.mix}  ${r.counts}  ${r.problems.join(' | ')}`);
  const passed = results.filter(r => !r.problems.length).length;
  console.log(`\n${passed}/${results.length} mixes passed`);
  process.exit(passed === results.length ? 0 : 1);
})().catch(err => { console.error(err.message.split('\n')[0]); process.exit(1); });
