import logger from '#modules/logger/index.js';
import { prepareResponses } from '#utils/validator/types/google-maps-reviews/score/prepare-responses.js';
import performBatchSpotCheck from './perform-batch-spot-check.js';
import validateMinerAgainstBatch from './validate-miner-against-batch.js';

/**
 * Score the responses
 * @param {Array} responses - The responses to score
 * @param {Object} metadata - The metadata of the responses
 * @param {Array} responseTimes - The response times of the responses
 * @param {Number} synapseTimeout - The synapse timeout
 * @param {Array} minerUIDs - The miner UIDs
 * @returns {Array} - The validation data
 */
const score = async (responses, metadata, responseTimes, synapseTimeout, minerUIDs, typeId) => {
  // Phase 1: Process all responses and collect spot check reviews
  const validationResults = prepareResponses(
    responses,
    minerUIDs,
    responseTimes,
    synapseTimeout,
    metadata,
    typeId
  );

  // Filter the validation results to only include those that have data and passed validation
  // and map them to an array of objects with the miner UID and the reviews
  const selectedSpotCheckReviews = validationResults
    .filter(validationResult => validationResult.data.length > 0 && validationResult.passedValidation)
    .map(validationResult => ({
      minerUID: validationResult.minerUID,
      reviews: validationResult.data
    }));

  // Phase 2: Batch spot check if we have any reviews to check
  let verifiedReviewsMap = new Map();
  if (selectedSpotCheckReviews.length > 0) {
    try {
      verifiedReviewsMap = await performBatchSpotCheck(selectedSpotCheckReviews, metadata.fid);
    } catch (error) {
      logger.error('Google Maps Reviews - Batch spot check failed:', error);
      // If batch spot check fails, fail all miners that needed spot checking
      for (const validationResult of validationResults) {
        if (validationResult.data.length > 0) {
            validationResult.passedValidation = false;
            validationResult.validationError = 'Batch spot check failed';
        }
      }
    }
  }

  // Phase 3: Validate each miner against batch results
  for (const validationResult of validationResults) {
    if (validationResult.data.length > 0 && validationResult.passedValidation) {
      const spotCheckPassed = validateMinerAgainstBatch(
        validationResult.data,
        metadata.fid,
        validationResult.minerUID,
        verifiedReviewsMap
      );

      if (spotCheckPassed) {
        logger.info(`Google Maps Reviews - UID ${validationResult.minerUID}: Validation complete - ${validationResult.count} reviews, most recent: ${validationResult.mostRecentDate?.toISOString()}`);
      } else {
        logger.error(`Google Maps Reviews - UID ${validationResult.minerUID}: Failed spot check validation`);
        validationResult.passedValidation = false;
        validationResult.validationError = 'Failed spot check verification';
        validationResult.count = 0;
        validationResult.mostRecentDate = undefined;
      }
    }
  }

  return validationResults;
}

export default score;
