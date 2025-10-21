import GoogleMapsReviews from './google-maps-reviews/index.js';
import XTweets from './x-tweets/index.js';

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

export default {
  getTypeById
}
