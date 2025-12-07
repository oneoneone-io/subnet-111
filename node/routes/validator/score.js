import responseService from '#modules/response/index.js';
import time from '#modules/time/index.js';
import logger from '#modules/logger/index.js';
import calculateFinalScores from '#utils/validator/calculate-final-scores.js';
import Types from '#utils/validator/types/index.js';
import uploadToS3 from '#utils/validator/upload-to-s3.js';
import sendMetadata from '#utils/validator/send-metadata.js';
import streamJsonParser from '#modules/stream-json-parser/index.js';

/**
 * Output the result of the score route
 * @param {Object} param0 - The parameters
 * @returns {Object} - The output
 */
const output = ({ metadata, typeId, typeName, statistics, finalScores }) => {
  return {
    status: 'success',
    typeId,
    typeName,
    metadata,
    statistics,
    scores: finalScores.map(result => result.score),
    timestamp: time.getCurrentTimestamp(),
    detailedResults: finalScores
  }
}

/**
 * Validate the request
 * Validate if typeId exist
 * Validate if metadata exist
 * Validate if responses is an array
 * Validate if responses is not empty
 * @param {Object} param0 - The parameters
 * @returns {Object} - The output
 */
const validate = ({ typeId, metadata, responses, selectedType }) => {
  let isValid = true
  let message = {};
   // Validate required parameters
   if (!typeId || !metadata || !responses || !Array.isArray(responses) || !selectedType) {
    isValid = false;
    message = {
      error: 'Invalid request',
      message: 'typeId, metadata, responses array and selectedType are required'
    };
  }

  return {
    isValid,
    message
  }
}

/**
 * Score Route
 * This route is used to score the responses for a type
 * It returns a structured response with the scores and metadata.
 *
 * @example
 * POST /score-responses
 * {
 *   "typeId": "google-maps-reviews",
 *   "metadata": {
 *     "dataId": "0x89c258f97bdb102b:0xea9f8fc0b3ffff55",
 *   },
 *   "responses": [
 *     [
 *       {
 *         "reviewId": "1234567890",
 *         "reviewerId": "1234567890",
 *         "reviewerName": "John Doe",
 *         "reviewerUrl": "https://www.google.com/maps/contrib/1234567890",
 *         "reviewUrl": "https://www.google.com/maps/review/1234567890",
 *         "publishedAtDate": "2025-01-01T12:00:00.000Z",
 *         "placeId": "ChIJN1t_t254w4AR4PVM_67p73Y",
 *         "cid": "1234567890",
 *         "fid": "0x89c258f97bdb102b:0xea9f8fc0b3ffff55",
 *         "totalScore": 5
 *       }
 *     ]
 *   ],
 *   "responseTimes": [2.5],
 *   "synapseTimeout": 120,
 *   "minerUIDs": [1]
 * }
 *
 * @param {import('express').Request} request - The request object
 * @param {import('express').Response} response - The response object
 * @returns {Promise<void>}
 */
const execute = async(request, response) => {
  try {
    // Parse the request stream directly without buffering
    const body = await streamJsonParser.parseStreamJSON(request);

    const {
      typeId,
      metadata,
      responses,
      responseTimes = [],
      synapseTimeout = 120,
      minerUIDs = []
    } = body;

    // Get the type
    const selectedType = Types.getTypeById(typeId);

    // Validate the request
    const { isValid, message } = validate({ typeId, metadata, responses, selectedType });
    if (!isValid) {
      return responseService.badRequest(response, message);
    }

    // Log the request and important information
    logger.info(`${selectedType.name} - Scoring ${responses.length} responses.`);
    logger.info(`${selectedType.name} - Metadata: ${JSON.stringify(metadata)}`);
    logger.info(`${selectedType.name} - Response times provided: ${responseTimes.length > 0 ? 'Yes' : 'No'}`);
    logger.info(`${selectedType.name} - Synapse timeout: ${synapseTimeout} seconds`);
    logger.info(`${selectedType.name} - Miner UIDs: [${minerUIDs.join(', ')}]`);

    // Score the responses
    const validationResults = await selectedType.score(responses, metadata, responseTimes, synapseTimeout, minerUIDs, typeId);

    // Create final scores and statistics
    const { statistics, finalScores } = calculateFinalScores(selectedType, validationResults, synapseTimeout);

    // Return scoring results with statistics
    const result = output({ metadata, typeId, typeName: selectedType.name, statistics, finalScores });

    // Upload to S3 and send metadata OR send to digestion endpoint (legacy)
    if (process.env.S3_ENABLED === 'true') {
      // Upload to S3 and get the total item count, S3 bucket and S3 path
      const { totalItemCount, s3Bucket, s3Path } = await uploadToS3(validationResults, metadata, selectedType);

      // Send metadata with the actual deduplicated count
      await sendMetadata(selectedType.id, metadata, totalItemCount, s3Bucket, s3Path);
    } else {
      // Legacy system: digestion endpoint
      selectedType.prepareAndSendForDigestion(responses, minerUIDs, metadata)
        .catch(error => logger.error(`Error in prepareAndSendForDigestion: ${error.message}`));
    }

    return responseService.success(response, result);
  } catch (error) {
    logger.error(`Error scoring responses:`, error);
    return responseService.internalServerError(response, {
      error: 'Failed to score responses',
      message: error.message,
      timestamp: time.getCurrentTimestamp()
    });
  }
}

export default {
  execute,
  output,
  validate,
}
