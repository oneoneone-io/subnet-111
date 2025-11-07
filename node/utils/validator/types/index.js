import GoogleMapsReviews from './google-maps-reviews/index.js';
import XTweets from './x-tweets/index.js';
import random from '#modules/random/index.js';
import logger from '#modules/logger/index.js';

const TYPES = [
  { func: GoogleMapsReviews, weight: 25 },
  { func: XTweets, weight: 75 }
]

/**
 * Get a type by its id
 * @param {string} id - The id of the type
 * @returns {Object} - The type
 */
const getTypeById = (id) => {
  return TYPES.find(type => type.id === id);
}

/**
 * Get a random type from the TYPES array based on configured weights
 * @returns {Object} - The selected type
 */
const getRandomType = () => {
  // Build weighted array based on percentages
  const weightedTypes = [];
  for (const type of TYPES) {
    const weight = type.weight;
    // Add type to array 'weight' times (e.g., weight=70 adds 70 copies)
    for (let count = 0; count < weight; count++) {
      weightedTypes.push(type);
    }
  }

  // Select random from weighted array
  const selected = random.fromArray(weightedTypes);
  logger.info(`Type selection: ${selected.func.name} (weights: ${selected.weight})`);

  return selected.func;
};

export default {
  getRandomType,
  getTypeById
}
