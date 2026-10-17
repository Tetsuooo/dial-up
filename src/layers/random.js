// Small random helpers shared by the layers.

// Bell-curve random number between min and max. A higher `skew` pushes the result towards min.
// (The same function the original site used for the size of the images.)
export const randn_bm = (min, max, skew) => {
  let num;
  do {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random(); // converting [0,1) to (0,1)
    while (v === 0) v = Math.random();
    num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    num = num / 10.0 + 0.5; // translate to 0 -> 1
  } while (num > 1 || num < 0); // resample if out of range
  return Math.pow(num, skew) * (max - min) + min; // skew, stretch to the range, offset to min
};

// -1 or 1
export const randomDirection = () => (Math.random() > 0.5 ? -1 : 1);

// A shuffled copy of the array (Fisher-Yates)
export const shuffle = (array) => {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};
