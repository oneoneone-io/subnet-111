import logger from '#modules/logger/index.js';
import apify from '#modules/apify/index.js';
import config from '#config';
import retryable from '#modules/retryable/index.js';

/**
 * Fetches Google Maps reviews for a given place using the Apify actor.
 *
 * This function retrieves reviews for a specific place identified by its dataId (Data ID).
 * It uses the configured Apify actor to scrape Google Maps reviews with retry logic
 * for reliability. The number of reviews fetched is determined by the configuration
 * setting `config.MINER.GOOGLE_MAPS_REVIEWS.REVIEW_COUNT`.
 *
 * @example
 * ```javascript
 * const reviews = await fetch({
 *   dataId: '0x89c258f97bdb102b:0xea9f8fc0b3ffff55',
 *   language: 'en',
 *   sort: 'newest'
 * });
 * ```
 *
 * @param {Object} parameters - The parameters for fetching reviews
 * @param {string} parameters.dataId - The Google Maps place Data ID (dataId)
 * @param {string} [parameters.language='en'] - The language code for reviews (e.g., 'en', 'es', 'fr')
 * @param {string} [parameters.sort='newest'] - The sort order for reviews ('newest', 'oldest', 'most_relevant')
 * @returns {Promise<Array>} A promise that resolves to an array of review objects from the Apify actor
 * @throws {Error} Throws an error if the Apify actor fails or if there are network issues
 *
 * @description
 * - Uses retryable wrapper with up to 10 retry attempts for reliability
 * - Logs detailed information about the fetch process
 * - Review count is fixed and configured via `config.MINER.GOOGLE_MAPS_REVIEWS.REVIEW_COUNT`
 * - Utilizes the configured Apify actor from `config.MINER.APIFY_ACTORS.GOOGLE_MAPS_REVIEWS`
 */
const fetch = async ({ dataId, language = 'en', sort = 'newest' }) => {
  try {
    // Use fixed count from config instead of query parameter
    const countNumber = config.MINER.GOOGLE_MAPS_REVIEWS.REVIEW_COUNT;

    logger.info(`[Miner] Fetching reviews - Data ID: ${dataId}, Count: ${countNumber}, Language: ${language}, Sort: ${sort}`);

    // Run the Apify actor and get the results
    logger.info(`[Miner] Starting Apify actor for reviews fetch...`);
    const items = await retryable(async () => {
      return await apify.runActorAndGetResults(config.MINER.GOOGLE_MAPS_REVIEWS.APIFY_ACTORS.GOOGLE_MAPS_REVIEWS, {
        placeFIDs: [dataId],
        maxItems: countNumber,
        language: language,
        sort: sort,
      });
    }, 10);

    // Return structured response with reviews and metadata
    return items;
  } catch (error) {
    logger.error(`[Miner] Error fetching reviews:`, error);
    throw error;
  }
}

export default fetch
