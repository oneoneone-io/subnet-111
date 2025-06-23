import config from '#config';
import responseService from '#modules/response/index.js';
import time from '#modules/time/index.js';
import logger from '#modules/logger/index.js';
import retryable from '#modules/retryable/index.js';
import getEligiblePlace from '#utils/validator/google-maps/create-synthetic/get-eligible-place.js';

/**
 * Output the result of the create synthetic task route
 * @param {Object} param0 - The parameters
 * @returns {Object} - The output
 */
const output = ({ selectedPlace, totalDuration }) => {
  return {
    status: 'success',
    task: {
      dataId: selectedPlace.fid,  // Use fid as dataId
      id: selectedPlace.placeId,
      synapse_params: {
        language: config.VALIDATOR.GOOGLE_REVIEWS_SYNAPSE_PARAMS.language,
        sort: config.VALIDATOR.GOOGLE_REVIEWS_SYNAPSE_PARAMS.sort,
        timeout: config.VALIDATOR.GOOGLE_REVIEWS_SYNAPSE_PARAMS.timeout
      },
      timestamp: time.getCurrentTimestamp(),
      totalTime: totalDuration
    }
  }
}

/**
 * Validate the environment
 * @returns {Object} - The validation result
 */
const validate = () => {
  let isValid = true;
  let message = {};

  // Validate Apify token for place search
  if (!process.env.APIFY_TOKEN) {
    logger.error(`APIFY_TOKEN not configured`);
    isValid = false;
    message = {
      error: 'Configuration error',
      message: 'APIFY_TOKEN not configured'
    }
  }

  return {
    isValid,
    message
  }
}

/**
 * Create Synthetic Task Route
 * This route is used to create a synthetic task for a given place.
 * It returns the place FID and synapse parameters for miners to fetch reviews.
 * @example
 * GET /validator/create-synthetic
 * @param {import('express').Request} request - The request object
 * @param {import('express').Response} response - The response object
 * @returns {Promise<void>}
 */
const execute = async (request, response) => {
  const startTime = Date.now();

  // Validate the environment
  const { isValid, message } = validate();
  if (!isValid) {
    return responseService.internalServerError(response, message);
  }

  try {
    // Get an eligible place
    logger.info(`Starting synthetic task creation.`);
    const selectedPlace = await retryable(getEligiblePlace, 10);

    const totalDuration = time.getDuration(startTime);
    logger.info(`Successfully created synthetic task in ${totalDuration.toFixed(2)}s`);

    // Return the synthetic task data
    const result = output({ selectedPlace, totalDuration });
    responseService.success(response, result);
  } catch (error) {
    const totalDuration = time.getDuration(startTime);
    logger.error(`Error creating synthetic task (total time: ${totalDuration.toFixed(2)}s):`, error);
    responseService.internalServerError(response, {
      error: 'Failed to create synthetic task',
      message: error.message,
      totalTime: totalDuration,
      timestamp: time.getCurrentTimestamp()
    });
  }
}

export default {
  execute,
  validate,
  output,
}
