# dial-up

The dial-up pages of [modem](https://modemodemodem.xyz): one interactive page per mix, at
`https://dial-up.modemodemodem.xyz/#mix01` … `#mix40`. The main Modem site shows these inside an
iframe (its `dial-up.html`), and its hover previews read `assets/asset-data.json` from here.
Both of those depend on this repo, so **keep the `#mixNN` addresses, the `assets/mixNN/…` paths
and `assets/asset-data.json` as they are.**

Each page is a collage made of four layers (back to front): a **gradient**, the **samples** (images
and GIFs that keep appearing in all sizes), the **mist** and the **background** (images stretched over
the screen that drift and fade in and out). On top of that: the splash panel with the artist's
links, the info button, the player (SoundCloud) and the `<` `>` buttons.

## Changing how the collage looks

Every number is in **`src/layers/settings.js`**, each with a comment (and the value it had in the
original 2020 version): how often a new image appears, how many are on screen, how big, how
transparent, which blend mode, how the mist and background drift and fade, which layer is in front.

## Working on it

```
npm install
node read_files.js # writes src/assets/asset-data.json (not in git; needed before the first build)
npm start          # dev server on http://localhost:3000 (serves src/assets)
npm run build      # builds the site into docs/ (this is what GitHub Pages publishes)
```

GitHub Pages publishes the **`docs/`** folder of `main` (custom domain in `CNAME`). To publish a
change: `npm run build`, then commit everything (including `docs/`) and push to `main`.
The build empties `docs/` and recreates it; it puts back the two things the Modem site needs:
`assets/asset-data.json` and `CNAME`.

### Adding or changing a mix

1. Put the images in `src/assets/mixNN/<layer>/`, where the layer is `gradient`, `splash`,
   `background`, `mist` or `samples` (a mix needs at least a gradient and a splash). GIFs and WebPs
   are used as they are; PNGs and JPEGs are converted to WebP by the next step (needs ImageMagick).
2. `node compress_assets.js` makes the new images lighter without changing how they look: GIFs
   become animated WebP (same frames and timing, repeating forever) and stills larger than they're
   ever shown are scaled down. `--dry` only reports what it would do.
3. `node read_files.js` rewrites `src/assets/asset-data.json` (the list of the images of every mix).
4. Add the mix to `src/mixurls.json` (SoundCloud player) and `src/artist-links.json` (the sc / bc
   buttons). The number of mixes the `>` button goes up to is `MIX_COUNT` in `src/index.js`.
5. `npm run build`, commit, push.

### Where things are

| | |
|---|---|
| `src/index.js` | start-up, the player, the `<` `>` buttons, switching between mixes |
| `src/dom-ui.js` | the splash panel, the social buttons, the info button |
| `src/layers/` | the collage: `samples.js`, `backdrop.js` (mist and background), `assets.js` (loading, GIF looping), `settings.js` |
| `src/assets/` | all the images, one folder per mix, plus `asset-data.json` |
| `docs/` | the built site that GitHub Pages serves (don't edit by hand) |

Only the images that are about to be shown are downloaded, one at a time, so a mix starts
immediately however many images it has. GIFs are told to repeat forever when they're loaded, so
none of them freezes after playing once.
