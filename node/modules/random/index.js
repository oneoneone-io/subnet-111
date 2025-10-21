/**
 * Get a random element from an array
 * @param {Array} array - The array to get a random element from
 * @returns {any} - The random element
 */
function fromArray(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Get a random number between a min and max
 * @param {number} min - The minimum number
 * @param {number} max - The maximum number
 * @returns {number} - The random number
 */
function between(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Shuffle an array and return a random subset of the array
 * @param {Array} array - The array to shuffle
 * @param {number} count - The number of elements to return
 * @returns {Array} - The shuffled array
 */
function shuffle(array, count) {
  let size = count || array.length; // eslint-disable-line
  return array.sort(() => Math.random() - 0.5).slice(0, size);
}

export default {
  fromArray,
  between,
  shuffle
};
