import GoogleMapsReviews from './google-maps-reviews/index.js';

const TYPES = [
  GoogleMapsReviews
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
