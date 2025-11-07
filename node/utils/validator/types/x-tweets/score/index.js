import logger from '#modules/logger/index.js';
import { prepareResponses } from '#utils/validator/types/x-tweets/score/prepare-responses.js';
import performBatchSpotCheck from './perform-batch-spot-check.js';
import validateMinerAgainstBatch from './validate-miner-against-batch.js';

/**
 * Score the responses
 * @param {Array} responses - The responses to score
 * @param {Object} metadata - The metadata of the responses (contains keyword)
 * @param {Array} responseTimes - The response times of the responses
 * @param {Number} synapseTimeout - The synapse timeout
 * @param {Array} minerUIDs - The miner UIDs
 * @param {string} typeId - The type ID
 * @returns {Array} - The validation data
 */
const score = async (responses, metadata, responseTimes, synapseTimeout, minerUIDs, typeId) => {
  // Phase 1: Process all responses and collect spot check tweets
  const validationResults = prepareResponses(
    responses,
    minerUIDs,
    responseTimes,
    synapseTimeout,
    metadata,
    typeId
  );

  // Filter the validation results to only include those that have data and passed validation
  // and map them to an array of objects with the miner UID and the tweets
  const selectedSpotCheckTweets = validationResults
    .filter(validationResult => validationResult.data.length > 0 && validationResult.passedValidation)
    .map(validationResult => ({
      minerUID: validationResult.minerUID,
      tweets: validationResult.data
    }));

  // Phase 2: Batch spot check if we have any tweets to check
  let verifiedTweetsMap = new Map();
  if (selectedSpotCheckTweets.length > 0) {
    try {
      verifiedTweetsMap = await performBatchSpotCheck(selectedSpotCheckTweets, metadata.keyword);
    } catch (error) {
      logger.error('X Tweets - Batch spot check failed:', error);
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
        metadata.keyword,
        validationResult.minerUID,
        verifiedTweetsMap
      );
      
      if (spotCheckPassed) {
        logger.info(`X Tweets - UID ${validationResult.minerUID}: Validation complete - ${validationResult.count} tweets, most recent: ${validationResult.mostRecentDate?.toISOString()}`);
      } else {
        logger.error(`X Tweets - UID ${validationResult.minerUID}: Failed spot check validation`);
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

