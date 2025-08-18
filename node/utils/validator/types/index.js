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


/**
 * Get a random type from the TYPES array
 * @returns {Object} - The random type
 */
const getRandomType = () => {
  const randomIndex = Math.floor(Math.random() * TYPES.length);
  return TYPES[randomIndex];
}

export default {
  getRandomType,
  getTypeById
}