// utils.js

// Returns a promise that resolves after t milliseconds
export const sleep = (t) => new Promise(resolve => setTimeout(resolve, t));

// Returns either -1 or 1 randomly
export const randomDirection = () => (Math.random() > 0.5 ? -1 : 1);

// Shuffles an array in place using Fisher-Yates algorithm and returns it
export const shuffle = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

// Default export as an object combining the utilities
export default {
  sleep,
  randomDirection,
  shuffle,
};
