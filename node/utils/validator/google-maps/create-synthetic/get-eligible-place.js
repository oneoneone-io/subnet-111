import config from '#config';
import logger from '#modules/logger/index.js';
import time from '#modules/time/index.js';
import random from '#modules/random/index.js';
import apify from '#modules/apify/index.js';
import getRandomLocation from '#utils/validator/get-random-location.js';
/**
 * Get an eligible place
 * It pick a random location and place type from the hardcoded lists
 * It searches for places with Apify
 * It filters places with enough reviews for meaningful validation
 * It returns a random eligible place
 * If no eligible places are found, it throws an error
 * If we did not find a place after all retries, it throws an error
 * @returns {Promise<Object>} - The selected place
 */
const getEligiblePlace = async () => {
  const startTime = Date.now();

  // Get random location and place type
  const location = getRandomLocation();
  const placeType = random.fromArray(config.VALIDATOR.PLACE_TYPES);

  logger.info(`Creating synthetic task - Location: ${location}, Type: ${placeType}`);

  // Create the search query
  const searchQuery = `${placeType} in ${location}`;
  logger.info(`Searching with Apify Google Maps Search: ${searchQuery}`);

  // Run the Apify actor to search for places
  const items = await apify.runActorAndGetResults(config.VALIDATOR.APIFY_ACTORS.GOOGLE_MAPS_SEARCH, {
    searchTerms: [searchQuery],
    language: config.VALIDATOR.GOOGLE_REVIEWS_SYNAPSE_PARAMS.language,
    maxItems: config.VALIDATOR.APIFY_SEARCH_MAX_ITEMS
  });

  // Transform Apify results to our format - only include fields we actually use
  const places = items
  .filter(result => result.type === 'place') // Only include place results
  .map(place => ({
    placeId: place.placeId,
    fid: place.fid,
    name: place.title,
    reviewCount: place.reviewsCount || 0
  }));

  logger.info(`Found ${places.length} places from Apify search`);

  // Filter places with enough reviews for meaningful validation
  const eligiblePlaces = places.filter(place => place.reviewCount >= config.VALIDATOR.MIN_REVIEWS_REQUIRED);
  logger.info(`${eligiblePlaces.length} places meet review count threshold (>=${config.VALIDATOR.MIN_REVIEWS_REQUIRED})`);

  // If no eligible places are found, throw an error
  if (eligiblePlaces.length === 0) {
    const retryDuration = time.getDuration(startTime);
    throw new Error(`No eligible places found for ${placeType} in ${location} (took ${retryDuration.toFixed(2)}s), trying another combination...`);
  }

  // Pick a random eligible place
  const selectedPlace = random.fromArray(eligiblePlaces);

  logger.info(`Selected place: ${selectedPlace.name} (attempt took ${time.getDuration(startTime).toFixed(2)}s)`);
  logger.info(`  - FID: ${selectedPlace.fid}`);
  logger.info(`  - Review Count: ${selectedPlace.reviewCount}`);

  return selectedPlace;
}

export default getEligiblePlace;
