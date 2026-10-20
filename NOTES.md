# dial-up: notes

What was found, decided and changed, and what's still open. `README.md` is the how-to (building,
adding a mix, where things are); this file is the history and the reasoning behind it.

## How it fits together

- **This site:** `https://dial-up.modemodemodem.xyz/#mix01` … `#mix40`, one collage per mix. Repo
  `Tetsuooo/dial-up`, GitHub Pages publishes the `docs/` folder of `main`.
- **The main Modem site** (repo `Tetsuooo/modem`, on disk at `E:\ART\websites\modem_`) has a
  dial-up page (`src/dial-up.html`) that:
  - lists the mixes and, when you hover a name, shows preview images. It gets their names from
    `https://dial-up.modemodemodem.xyz/assets/asset-data.json` (the `samples` and `mist` lists).
  - opens a mix in a full-screen iframe: `https://dial-up.modemodemodem.xyz/#mixNN`, with
    `sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation"`. It
    switches mixes by changing only the `#mixNN` part.

  So the `#mixNN` addresses, the `assets/mixNN/<layer>/<file>` paths and `assets/asset-data.json`
  must stay. (The Modem page logs two script errors of its own, "Cannot use import statement
  outside a module" and "'originalError' has already been declared". They happen before dial-up is
  even opened and have nothing to do with this site.)
- **The original version** (2020, written by zwx00 with PixiJS 5) is the GitHub repo
  `Tetsuooo/modem_`. It's 4.5 GB because of the images, but the code is ~25 small files and can be
  read without cloning: `gh api repos/Tetsuooo/modem_/contents/src/index.js` (add
  `-H "Accept: application/vnd.github.raw"`). Its last commit is from 23 July 2020.
- **The 2025 rewrite** (this repo, with ChatGPT and Copilot) moved everything to PixiJS 8 and then
  to plain HTML images so GIFs would animate. Along the way most of the collage's numbers changed,
  which is why it felt empty.

## 17 October 2026: restoring the collage

### Why it felt uneventful

Both versions were run side by side (the original rebuilt from its own code with PixiJS 5.3.12,
fed with the same images) and compared at the same moments:

1. **Samples** (the images that keep appearing). Original: a new one every 0–5 s, 13 on screen,
   overlay blend, random opacity 0–1. Rewrite: 3–6 on screen, a new one roughly every 10 s, normal
   blend, opacity 0.4–0.9. It took ~2 minutes to even reach 6.
2. **Background and mist.** Original: *every* image of the layer on screen at once, stretched
   over the whole screen (edges visible), drifting very slowly, each fading in and out on its own
   slow wave and invisible for half of it. So there were always several translucent layers at
   different strengths. Rewrite: 4 oversized images per layer that faded in to almost solid and
   stayed there for 5–12 s, covering everything underneath. A bug also made each layer drop to 3.
3. **Loading.** Before showing any sample, the rewrite downloaded every image of the mix, one
   after the other. On mix12 that's 268 files / 40 MB, and no sample appeared within 25 seconds.
   It also kept downloading after you'd left the mix (279 more requests in 25 s).
4. **GIFs froze.** 261 animated GIFs have no "repeat" flag, and an `<img>` plays those once and
   stops. The original turned every GIF into a sprite sheet that looped forever.
5. **Layer order.** Original, back to front: gradient, samples, mist, background (mist and
   background are veils over the samples). Rewrite: gradient, mist, samples, background.

### What it is now (all in `src/layers/settings.js`)

| | now (= original) | the rewrite had |
|---|---|---|
| new sample every | 0–5 s (random) | 5–7 s, 60% chance |
| samples on screen | 13 | 3–6 |
| sample width | 150–9000 px, bell curve, skew 7 (usually ~150–400) | same curve, skew 6 |
| sample blend / opacity | overlay / 0–1 | normal / 0.4–0.9 |
| background & mist | all images (max 16 per layer), stretched to the screen, slow wave | 4 per layer, oversized, fade to solid |
| drift per 60th of a second | background 0.085 px, mist 0.025 px | 0.07 / 0.04 |
| layer order | gradient, samples, mist, background | gradient, mist, samples, background |

The original's wave is `periodic-function@1.1.4`'s `triangle()`, which goes from 1 down to -1 and
back. PixiJS doesn't draw anything with an opacity of 0 or below, so each image is visible for half
of its wave. `backdrop.js` does the same. Wave speed: `0.004 × random(0–1)` per 60th of a second,
times 0.2 (background) or 0.1 (mist).

Small deliberate differences from the original:
- The first sample appears right away, instead of after 0–5 s.
- GIFs play at their own speed. The original played every GIF at 6 frames per second.
- A mix with fewer than 13 samples repeats them. The original froze in that case, and with exactly
  one sample it showed up to 13 copies.
- Up to 16 images per backdrop layer (a random pick if there are more). The original used all of
  them; mix35 has 56 mist images.

### The double-click idea

From 15 Dec 2019 to 4 Jan 2020 the original's code made a sample 1.25× bigger whenever you let go
of it after clicking or dragging (`onDragEnd` in `src/strategies/painters/moving.js`). As written it
couldn't work: inside the handler `this` is the sprite, so `this.sprite.scale` doesn't exist. It was
removed in "mini bugfix for moving sprite onclick events" (commit `7117c3e`). The site people saw
never had it. It would be easy to add properly (see open ideas).

### Faster, lighter, nothing left running

- **Lazy loading:** images are downloaded only when they're about to be shown. A sample is
  fetched when it's its turn to appear, and only shown once it has fully loaded. The background and
  mist images of a mix load when the mix opens. Nothing is fetched for other mixes. A mix starts in
  about 0.2 s.
- **Cleaning up when you leave a mix:** every timer, animation and download in progress is stopped,
  all its images are removed, the looping GIF copies are released and the GIF cache is emptied.
  Measured: 0 requests for a mix after leaving it, flipping through all 40 mixes and back leaves
  nothing behind, and a 3.5-minute run stays flat at ~2.5 MB of memory.
- **Browser cache:** GitHub Pages decides it (10 minutes, then a cheap "has it changed?" check).
  It can't be configured and doesn't need to be.
- **PixiJS removed.** It only drew the gradient (under 4 invisible white placeholder sprites), on a
  WebGL canvas twice the size of the window. The gradient is now a plain image.
  JavaScript: 1.1 MB → 0.4 MB (95 KB as downloaded, gzipped).
- **Smoother:** in the same headless browser (software rendering), the original ran at 12–16 fps
  and the rewrite at 17–19. Now it's 34–36, with the main thread ~1% busy instead of ~100%.
- **GIFs loop forever:** the remaining GIFs are fetched once, their repeat flag is set to "forever"
  in the bytes (`layers/assets.js`), and every image shown gets its own copy, so it starts at the
  first frame.

### Fixed along the way

- Sample timers and three document-level listeners per image were never removed (they piled up
  with every image and every mix).
- `dom-ui.js` never really removed its window-resize listener (`bind` made a new function each
  time), and its splash timers weren't cleared.
- A hidden SoundCloud iframe was added every time you pressed play on another mix. Now the old one
  is removed.
- The first load without `#mixNN` rendered the page twice.
- The animation-frame list in the old background code grew forever.
- `npm start` didn't work: hot reload isn't supported with the module bundle, so the dev config
  now builds a normal one and doesn't copy 800 MB of images into memory.
- The build empties `docs/`, which deleted `docs/CNAME` (custom domain) and
  `docs/assets/asset-data.json` (the Modem previews) every time. They had been re-created by hand
  ("Create CNAME" commits, "assetdatafixfix"). The build now writes both.
- Removed: dead code (`strategies/`, `framework.js`, `menu.js`, `mix.js`, `utils/`, empty files,
  backups), stray files, and unused packages (PixiJS and plugins, axios, periodic-function,
  gifwrap, jimp, clean-webpack-plugin, path-browserify).

### Checked

- All 40 mixes, locally and on the live site (`tools/check-mixes.cjs`).
- Inside a sandboxed iframe exactly like the Modem page's, including switching mixes by hash.
- On the real Modem page after deploying: previews and iframe.
- Dragging with the mouse and with touch, `<` `>` buttons, arrow keys (they stop at 1 and 40),
  splash panel closing after 10 s and the `i` button.
- Window resize, phone portrait. The interface (splash, buttons, player) is pixel-identical to
  before at 1600×900, 1280×720, 390×844 and 820×1180.

## 17 October 2026: compressing the images

`compress_assets.js` (uses `sharp`), run once over everything and approved after a local preview:

- **856 GIFs → animated WebP** (266.6 MB → 95.0 MB). 557 are lossless (identical pixels), 299 are
  lossy at quality 80 (the photographic ones, where lossless would have been >25% bigger). Every
  result was checked for the same size, frames and timing, and that it loops forever. Identical
  neighbouring frames get merged (same total length). Frames that asked for 0–10 ms become 100 ms,
  which is how browsers already played them.
- **108 stills scaled down** to 2048 px (samples) or 2560 px (mist, background) on the longer side
  (97.9 MB → 31.4 MB). Samples are mostly shown 150–400 px wide, and over 2000 px about once in a
  thousand.
- **139 GIFs left as they were:** 134 where WebP wasn't smaller, 4 with damaged frame data
  (browsers still show them), and 1 (`mix26/samples/paintpegas2.gif`) that would have lost its
  animation.
- **Result:** images 833 MB → 595 MB, published site (`docs/`) 810 MB → 582 MB (GitHub Pages
  allows 1 GB). An average new sample costs 78 KB instead of 127 KB; on mix38, 175 KB instead of
  663 KB. `TOILET_PARTY.gif` was 15.7 MB and is now 0.58 MB.
- **The originals are in the git history:** everything before commit `b1ade04`. For example
  `git show c815206:src/assets/mix38/samples/TOILET_PARTY.gif > TOILET_PARTY.gif`.
- The comparison page used to approve it was a temporary local file. To redo a comparison, take a
  file from `c815206` (as above) and open both in a browser.

## 20 October 2026: smaller buttons on phones

Matej: the buttons were too big on a phone. On phones (short side ≤ 600px; desktop is unchanged and
was measured):
- play triangle 100px (it was at least 150, as `scaleExternalUIElements` has a 150px minimum)
- `<` `>` 34px (were 50)
- info 26px (was 32)
- side ◀ ▶ 28px

The triangle's svg sits in the corner on phones, so the triangle keeps ~20px from the left edge and its
bottom is level with the `<` button. Before, it was flush against the edge. `isPhone()` lives in
`dom-ui.js`; the `> <` sizing is `sizeBottomRightNav()` in `index.js`, also applied at load.
The play button gets its size at load now too, not only after a resize. Commit b3a6f89.

The Modem page (separate repo) changed at the same time: its back arrow is smaller on phones, and the
iframe ends above Modem's minimised player bar (`--mp-mini-h`), which used to cover `<` and the
play button.

## Gotchas

- `src/assets/asset-data.json` is **not in git** (it's in `.gitignore`). It's made by
  `node read_files.js` and must exist before building. The copy in git is
  `docs/assets/asset-data.json`. (There's also an old `asset-data.json` in the repo root that
  nothing uses.)
- Git converts line endings on this computer, so the files on disk can differ byte-for-byte from
  the committed ones. Compare with `git show HEAD:<path>`, or compare the parsed JSON.
- `sharp` on Windows keeps files open unless it reads from memory with its cache off
  (`compress_assets.js` does that). Otherwise replacing or deleting files fails with `EBUSY`.
- The copy plugin treats a target without an extension as a folder: hence `toType: 'file'` for
  `CNAME` in `webpack.js`.
- For automated browser checks on this computer, use Playwright's own Chromium. The installed Chrome
  and Edge get closed after ~10 s when started by a script.

## Open / ideas (nothing decided)

- **More interaction** (offered on 17 Oct; "not for now"):
  - double-click / double-tap a sample to grow it 1.25×
  - throw a dragged image so it glides on
  - the mist and background drifting a little with the cursor
  - busier while the mix plays, calmer when paused, and on to the next mix when one ends.
    Reacting to the beat isn't possible: SoundCloud doesn't let the page touch the audio.
- **Background and mist load in one burst** when a mix opens (up to 32 images). Spreading them out
  would help slow connections a little.
- **Graphics memory on big screens:** each background and mist image is a full-screen layer. On a
  4K screen with a weak graphics card that could be heavy. Not tested on real hardware; if it ever
  stutters, drawing those two layers on two canvases instead would fix it.
- **mix41** has images but no gradient, splash, SoundCloud link or artist links, and `MIX_COUNT` in
  `src/index.js` is 40, so it can't be reached.
- If the Modem page changes the iframe's `#mixNN` while music is playing, the old mix keeps
  playing (only the `<` `>` buttons and arrow keys stop it). This was already the case before.
- The images are stored twice in the repo (`src/assets` and `docs/assets`). Unavoidable as long as
  Pages publishes `docs/` from the branch; a GitHub Actions deploy could avoid it.
- `.travis.yml` and `.dependabot/` are leftovers from the 2019 starter template and do nothing.

## Commits

| commit | |
|---|---|
| `fcb5320` | 2025-06-25, the state before all this |
| `97fa058` | restore the original collage settings, load images on demand, drop PixiJS |
| `c815206` | rebuild docs |
| `b1ade04` | add `compress_assets.js` |
| `5b17aea` | compress the images |

Undo the compression only: `git revert 5b17aea b1ade04` and push (the reverted `docs/` is the
old site again). Then run `node read_files.js` before the next build, because the untracked
`src/assets/asset-data.json` still lists the WebP names. Undo everything: also revert
`c815206 97fa058`.
