import logger from '#modules/logger/index.js';
import responseService from '#modules/response/index.js';
import time from '#modules/time/index.js';
import Types from '#utils/miner/types/index.js';

/**
 * Formats the successful response output for a miner fetch operation
 * @param {Object} params - The parameters object
 * @param {string} params.typeId - The typeId of the task
 * @param {Object} params.metadata - The metadata of the task
 * @param {number} params.timeout - The timeout of the task in seconds
 * @param {Object[]} params.responses - The responses retrieved from the task execution
 * @returns {Object} The formatted output object with status, data, and timestamp
 */
const output = ({ typeId, metadata, timeout, responses }) => {
  return {
    status: 'success',
    typeId: typeId,
    metadata,
    timeout,
    responses,
    timestamp: time.getCurrentTimestamp(),
  }
}

/*
 * Validate the parameters for the miner fetch route
 * Validates if typeId is provided.
 * Validates if metadata is provided.
 * Validates if timeout is provided.
 *
 * @param {Object} parameters - The parameters to validate
 * @returns {Object} - The validation result
 */
const validate = ({ typeId, metadata, timeout }) => {
  let isValid = true;
  let message = {};

  if (!typeId) {
    logger.error(`[Miner] Error: Missing typeId parameter`);
    isValid = false;
    message.error = 'typeId is required';
    message.message = 'Please provide a valid typeId';
  } else if (!metadata) {
    logger.error(`[Miner] Error: Missing metadata parameter`);
    isValid = false;
    message.error = 'metadata is required';
    message.message = 'Please provide a valid metadata';
  } else if (!timeout) {
    logger.error(`[Miner] Error: Missing timeout parameter`);
    isValid = false;
    message.error = 'timeout is required';
    message.message = 'Please provide a valid timeout';
  } else if (!process.env.APIFY_TOKEN) {
    logger.error(`[Miner] Error: APIFY_TOKEN not configured`);
    isValid = false;
    message.error = 'Configuration error';
    message.message = 'APIFY_TOKEN not configured';
  }

  return { isValid, message };
}

/**
 * Miner fetch route
 * This route is used to fetch responses for a given typeId and metadata.
 * It uses the miner type to fetch the responses.
 * It returns a structured response with the responses and metadata.
 *
 * @example
 * GET /miner/fetch
 *
 * @param {import('express').Request} request - The request object
 * @param {import('express').Response} response - The response object
 * @returns {Promise<void>}
 */
const execute = async (request, response) => {
  const { typeId, metadata, timeout } = request.body;

  // Get the type by id
  const selectedType = Types.getTypeById(typeId);
  if(!selectedType){
    return responseService.badRequest(response, {
      typeId,
      metadata,
      timeout,
      error: 'Invalid typeId',
      message: 'The provided typeId is not valid',
      timestamp: time.getCurrentTimestamp(),
    });
  }

  try {
    logger.info(`[Miner] Fetching responses - Type ID: ${typeId}, Metadata: ${JSON.stringify(metadata)}, Timeout: ${timeout}`);

    // Validate the parameters and continue if valid.
    const { isValid, message } = validate({ typeId, metadata, timeout });
    if (!isValid) {
      return responseService.badRequest(response, message);
    }

    const responses = await selectedType.fetch(metadata);

    // Return structured response with reviews and metadata
    const result = output({ typeId, metadata, timeout, responses });
    return responseService.success(response, result);
  } catch (error) {
    logger.error(`[Miner] Error fetching responses:`, error);
    return responseService.internalServerError(response, {
      typeId,
      metadata,
      timeout,
      error: 'Failed to fetch responses',
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
