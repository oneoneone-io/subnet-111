import logger from '#modules/logger/index.js';
import responseService from '#modules/response/index.js';
import apify from '#modules/apify/index.js';
import time from '#modules/time/index.js';
import config from '#config';
import retryable from '#modules/retryable/index.js';

/**
 * Output the result of the Google Maps Reviews route
 * @param {string} fid - The FID of the place
 * @param {number} countNumber - The count of the reviews
 * @param {string} language - The language of the reviews
 * @param {string} sort - The sort of the reviews
 * @param {Object[]} items - The reviews
 * @returns {Object} - The output
 */
const output = (fid, count, language, sort, items) => {
  return {
    status: 'success',
    fid: fid,
    parameters: {
      count,
      language,
      sort
    },
    reviews: items,
    timestamp: time.getCurrentTimestamp(),
  }
}

/*
 * Validate the parameters for the Google Maps Reviews route
 * Validates if fid is provided.
 * Validates if sort is one of the allowed values.
 * Validates if Apify token is configured.
 *
 * @param {Object} parameters - The parameters to validate
 * @returns {Object} - The validation result
 */
const validate = (parameters) => {
  let isValid = true;
  let message = {};
  const { fid, sort } = parameters;
  const validSortOptions = ['newest', 'relevant', 'highest', 'lowest'];

  if (!fid) {
    logger.error(`[Miner] Error: Missing fid parameter`);
    isValid = false;
    message.error = 'fid is required';
    message.message = 'Please provide a valid FID (place identifier)';
  } else if (!validSortOptions.includes(sort)) {
    logger.error(`[Miner] Error: Invalid sort parameter: ${sort}`);
    isValid = false;
    message.error = 'Invalid sort parameter';
    message.message = `Sort must be one of: ${validSortOptions.join(', ')}`;
  } else if (!process.env.APIFY_TOKEN) {
    logger.error(`[Miner] Error: APIFY_TOKEN not configured`);
    isValid = false;
    message.error = 'Configuration error';
    message.message = 'APIFY_TOKEN not configured';
  }

  return { isValid, message };
}

/**
 * Google Maps Reviews Route
 * This route is used to fetch reviews for a given place FID.
 * It uses the Apify actor to fetch the reviews.
 * It returns a structured response with the reviews and metadata.
 * Uses fixed count from config.MINER.REVIEW_COUNT
 *
 * @example
 * GET /google-maps/reviews/:fid?language=en&sort=newest
 *
 * @param {import('express').Request} request - The request object
 * @param {import('express').Response} response - The response object
 * @returns {Promise<void>}
 */
const execute = async (request, response) => {
  try {
    const { fid } = request.params;
    const { language = 'en', sort = 'newest' } = request.query;
    // Use fixed count from config instead of query parameter
    const countNumber = config.MINER.REVIEW_COUNT;

    logger.info(`[Miner] Fetching reviews - FID: ${fid}, Count: ${countNumber}, Language: ${language}, Sort: ${sort}`);

    // Validate the parameters and continue if valid.
    const { isValid, message } = validate({ fid, sort });
    if (!isValid) {
      return responseService.badRequest(response, message);
    }

    // Run the Apify actor and get the results
    logger.info(`[Miner] Starting Apify actor for reviews fetch...`);
    const items = await retryable(async () => {
      return await apify.runActorAndGetResults(config.MINER.APIFY_ACTORS.GOOGLE_MAPS_REVIEWS, {
        placeFIDs: [fid],
        maxItems: countNumber,
        language: language,
        sort: sort,
      });
    }, 10);

    // Return structured response with reviews and metadata
    const result = output(fid, countNumber, language, sort, items);
    return responseService.success(response, result);
  } catch (error) {
    logger.error(`[Miner] Error fetching reviews:`, error);
    return responseService.internalServerError(response, {
      error: 'Failed to fetch reviews',
      message: error.message,
      timestamp: time.getCurrentTimestamp(),
    });
  }
}

export default {
  execute,
  validate,
  output,
};
