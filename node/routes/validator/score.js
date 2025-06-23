import responseService from '#modules/response/index.js';
import time from '#modules/time/index.js';
import logger from '#modules/logger/index.js';
import performBatchSpotCheck from '#utils/validator/google-maps/score/perform-batch-spot-check.js';
import validateMinerAgainstBatch from '#utils/validator/google-maps/score/validate-miner-against-batch.js';
import calculateFinalScores from '#utils/validator/google-maps/score/calculate-final-scores.js';
import { prepareResponses } from '#utils/validator/google-maps/score/prepare-responses.js';
import prepareAndSendForDigestion from '#utils/validator/google-maps/score/prepare-and-send-for-digestion.js';

/**
 * Output the result of the score route
 * @param {Object} param0 - The parameters
 * @returns {Object} - The output
 */
const output = ({ fid, scores, minScore, maxScore, meanScore, finalScores }) => {
  return {
    status: 'success',
    fid,
    scores,
    statistics: {
      count: scores?.length || 0,
      mean: meanScore || 0,
      min: minScore || 0,
      max: maxScore || 0
    },
    timestamp: time.getCurrentTimestamp(),
    detailedResults: finalScores
  }
}

/**
 * Validate the request
 * Validate if fid exist
 * Validate if responses is an array
 * Validate if responses is not empty
 * @param {Object} param0 - The parameters
 * @returns {Object} - The output
 */
const validate = ({ fid, responses }) => {
  let isValid = true
  let message = {};
   // Validate required parameters
   if (!fid || !responses || !Array.isArray(responses)) {
    isValid = false;
    message = {
      error: 'Invalid request',
      message: 'fid and responses array are required'
    };
  }

  return {
    isValid,
    message
  }
}

/**
 * Score Route
 * This route is used to score the responses for a given fid.
 * It returns a structured response with the scores and metadata.
 *
 * @example
 * POST /score-responses
 * {
 *   "fid": "ChIJN1t_t254w4AR4PVM_67p73Y",
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
 *         "fid": "ChIJN1t_t254w4AR4PVM_67p73Y",
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
    const {
      fid,
      responses,
      responseTimes = [],
      synapseTimeout = 120,
      minerUIDs = []
    } = request.body;

    // Validate the request
    const { isValid, message } = validate({ fid, responses });
    if (!isValid) {
      return responseService.badRequest(response, message);
    }

    // Log the request and important information
    logger.info(`Scoring ${responses.length} responses for fid: ${fid}`);
    logger.info(`Response times provided: ${responseTimes.length > 0 ? 'Yes' : 'No'}`);
    logger.info(`Synapse timeout: ${synapseTimeout} seconds`);
    logger.info(`Miner UIDs: [${minerUIDs.join(', ')}]`);

    // Phase 1: Process all responses and collect spot check reviews
    const { validationData, allSpotCheckReviews } = prepareResponses(responses, minerUIDs, fid);

    // Phase 2: Batch spot check if we have any reviews to check
    let verifiedReviewsMap = new Map();
    if (allSpotCheckReviews.length > 0) {
      try {
        verifiedReviewsMap = await performBatchSpotCheck(allSpotCheckReviews, fid);
      } catch (error) {
        logger.error('Batch spot check failed:', error);
        // If batch spot check fails, fail all miners that needed spot checking
        for (const minerData of validationData) {
          if (minerData.data.length > 0) {
            minerData.passedValidation = false;
            minerData.validationError = 'Batch spot check failed';
          }
        }
      }
    }

    // Phase 3: Validate each miner against batch results
    for (const minerData of validationData) {
      if (minerData.data.length > 0 && minerData.passedValidation) {
        const spotCheckPassed = validateMinerAgainstBatch(
          minerData.data,
          fid,
          minerData.minerUID,
          verifiedReviewsMap
        );

        if (spotCheckPassed) {
          logger.info(`UID ${minerData.minerUID}: Validation complete - ${minerData.count} reviews, most recent: ${minerData.mostRecentDate?.toISOString()}`);
        } else {
          logger.error(`UID ${minerData.minerUID}: Failed spot check validation`);
          minerData.passedValidation = false;
          minerData.validationError = 'Failed spot check verification';
          minerData.count = 0;
          minerData.mostRecentDate = undefined;
        }
      }
    }

    // Phase 4: Create scoring results with timing information
    const { scores, meanScore, minScore, maxScore, finalScores } = calculateFinalScores(validationData, responseTimes, synapseTimeout);

    // Return scoring results with statistics
    const result = output({fid, scores, minScore, maxScore, meanScore, finalScores});
    
    // Send the data for digestion. Don't wait for it to complete
    prepareAndSendForDigestion(responses, minerUIDs, fid);

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
