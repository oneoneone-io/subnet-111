import responseService from '#modules/response/index.js';
import time from '#modules/time/index.js';
import logger from '#modules/logger/index.js';
import retryable from '#modules/retryable/index.js';
import Types from '#utils/validator/types/index.js';

/**
 * Output the result of the create synthetic task route
 * @param {Object} param0 - The parameters
 * @returns {Object} - The output
 */
const output = ({ metadata, totalDuration, typeId, typeName }) => {
  return {
    status: 'success',
    task: {
      typeId,
      typeName,
      metadata,
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

  // Get a random type
  const selectedType = Types.getRandomType();
  logger.info(`Selected type: ${selectedType.name}`);

  try {
    // Create the synthetic task metadata
    logger.info(`${selectedType.name} - Starting synthetic task creation.`);
    const metadata = await retryable(selectedType.createSyntheticTask, 10);

    const totalDuration = time.getDuration(startTime);
    logger.info(`${selectedType.name} - Successfully created synthetic task in ${totalDuration.toFixed(2)}s`);

    // Return the synthetic task data
    const syntheticTask = output({
      metadata,
      totalDuration,
      typeId: selectedType.id,
      typeName: selectedType.name
    });
    responseService.success(response, syntheticTask);
  } catch (error) {
    const totalDuration = time.getDuration(startTime);
    logger.error(`${selectedType.name} - Error creating synthetic task (total time: ${totalDuration.toFixed(2)}s):`, error);
    responseService.internalServerError(response, {
      typeId: selectedType.id,
      typeName: selectedType.name,
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
