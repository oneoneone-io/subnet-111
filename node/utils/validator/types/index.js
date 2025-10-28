import GoogleMapsReviews from './google-maps-reviews/index.js';
import XTweets from './x-tweets/index.js';
import random from '#modules/random/index.js';

const TYPES = [
  GoogleMapsReviews,
  XTweets
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
 * Get a random type from the TYPES array
 * @returns {Object} - The random type
 */
const getRandomType = () => random.fromArray(TYPES);

export default {
  getRandomType,
  getTypeById
}
