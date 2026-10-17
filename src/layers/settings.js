// All the numbers that decide how busy and how alive the collage feels, in one place.
//
// "original" = the value in the first version of the site (the modem_ repo, 2020). The settings
// below are those original values; they were changed during the rewrite and have been restored.

// Which layer is in front of which (CSS z-index). From the back: the gradient, then the samples,
// then the mist and the background as translucent veils over them.
// original: gradient, samples, mist, background
export const LAYER_Z = {
  gradient: 0,
  samples: 20,
  mist: 25,
  background: 30,
};

export const SAMPLES = {
  // A new image appears after a random wait of 0 .. maxWaitMs (the first one right away).
  // original: Math.random() * 5000
  maxWaitMs: 5000,

  // Once this many images are on screen, every new one makes a random old one disappear.
  // original: 13  (the rewrite had 3 - 6, which is what made the collage feel empty)
  maxOnScreen: 13,

  // Width in px of each image: a bell curve between min and max. A higher `skew` means more small
  // images and fewer huge ones (a few in a hundred are well over 1000px wide).
  // original: 150, 9000, skew 7
  width: { min: 150, max: 9000, skew: 7 },

  // How the images are mixed into whatever is underneath them (the gradient and the other images).
  // original: overlay (the rewrite had normal, which is why the images looked flat)
  blendMode: 'overlay',

  // Each image gets a random opacity between these two.
  // original: 0 .. 1  (the rewrite had 0.4 .. 0.9)
  opacity: { min: 0, max: 1 },
};

// The background and the mist: every image is stretched over the whole screen, drifts very slowly
// and fades in and out on a slow wave (visible for half of each wave, strongest in the middle of
// it). They all keep doing that at the same time, so there are always a few at different strengths.
// (The rewrite had 4 oversized images per layer, fading in to almost solid, which hid everything
// under them.)
export const BACKDROP = {
  // At most this many images per layer at the same time (a random pick if the mix has more).
  // original: all of them
  maxImages: 16,

  // How fast the wave moves along, per 60th of a second. original: 0.004
  waveSpeed: 0.004,

  background: {
    drift: 0.085,   // top speed of the drifting, in px per 60th of a second. original: 0.085
    wave: 0.2,      // wave length: higher = quicker fades. original: 0.2
    startRange: 100, // each image starts at a random point in the wave. original: 100
  },
  mist: {
    drift: 0.025,   // original: 0.025
    wave: 0.1,      // original: 0.1
    startRange: 37, // original: 37
  },
};
