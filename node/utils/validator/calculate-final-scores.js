import logger from '#modules/logger/index.js';
import time from '#modules/time/index.js';
import { createEmptyValidationResult } from '#utils/validator/validation-result.js';

/**
 * Calculate final scores using the new three-component scoring system:
 * - Speed Score (30%): Based on response time
 * - Volume Score (50%): Based on number of reviews returned
 * - Recency Score (20%): Based on most recent review date
 *
 * @param {Array} validationResults - Array of validation data with metrics
 * @param {Object} selectedType - The selected type object
 * @param {number} synapseTimeout - The synapse timeout value in seconds
 * @returns {Array} Final scores for each miner
 */
const calculateFinalScores = (selectedType, validationResults, synapseTimeout = 120) => {
  // Calculate minimums and maximums for normalization
  const validResults = validationResults.filter(validationResult =>
    validationResult.passedValidation
    && validationResult.responseTime < synapseTimeout
    && validationResult.count > 0
  );

  // If no valid results, return the scoring results with 0 scores
  if (validResults.length === 0) {
    logger.warning(`${selectedType.name} - No valid results to score`);
    const finalScores = validationResults.map((validationResult) => createEmptyValidationResult({
      minerUID: validationResult.minerUID,
      responseTime: validationResult.responseTime,
      validationError: validationResult.validationError,
    }));

    const scores = finalScores.map(result => result.score);
    return {
      statistics: {
        count: scores?.length || 0,
        mean: 0,
        min: 0,
        max: 0,
      },
      finalScores
    };
  }

  // Calculate the response times, counts, and most recent dates
  const validResponseTimes = validResults.map(response => response.responseTime);
  const validCounts = validResults.map(response => response.count);
  const validRecentDates = validResults
    .map(response => response.mostRecentDate)
    .filter(date => date !== undefined);

  // Calculate min/max values for normalization
  const Tmin = Math.min(...validResponseTimes);
  const Vmax = Math.max(...validCounts);
  const mostRecentDateOverall = time.getMostRecentDate(validRecentDates);
  const oldestDateOverall = time.getOldestDate(validRecentDates);
  const dateRange = mostRecentDateOverall && oldestDateOverall ?
    (mostRecentDateOverall.getTime() - oldestDateOverall.getTime()) : 0;

  logger.info(`${selectedType.name} - Scoring parameters - Tmin: ${Tmin.toFixed(2)}s, Vmax: ${Vmax} reviews, Date range: ${dateRange / (1000 * 60 * 60 * 24)} days`);

  const finalScores = validationResults.map((validationResult) => {
    // Reject if validation fails or response time >= synapseTimeout
    if (!validationResult.passedValidation || validationResult.responseTime >= synapseTimeout) {
      // istanbul ignore next
      return createEmptyValidationResult({
        minerUID: validationResult.minerUID,
        responseTime: validationResult.responseTime,
        validationError: validationResult.validationError || (validationResult.responseTime >= synapseTimeout ? `Response timeout (>= ${synapseTimeout}s)` : 'Unknown error'),
      });
    }

    // Speed score (30%) - faster responses get higher scores
     /* istanbul ignore next */
    let speedScore = (validationResult.responseTime > 0 && validationResult.count > 0) ? Tmin / validationResult.responseTime : 0;

    // Volume score (50%) - more reviews get higher scores
     /* istanbul ignore next */
    let volumeScore = Vmax > 0 ? validationResult.count / Vmax : 0;

    // Recency score (20%) - more recent reviews get higher scores
    let recencyScore = 0;
    if (validationResult.mostRecentDate && dateRange > 0) {
      const dateScore = (validationResult.mostRecentDate.getTime() - oldestDateOverall.getTime()) / dateRange;
      recencyScore = dateScore;
    } else if (validationResult.mostRecentDate && dateRange === 0) {
      // All miners have same date, give full score
      recencyScore = 1;
    }

    // Final score is weighted average of all components
    let finalScore = (selectedType.scoreConstants.SPEED * speedScore) + (selectedType.scoreConstants.VOLUME * volumeScore) + (selectedType.scoreConstants.RECENCY * recencyScore);

    // Float the values to remove potential numerical imprecision
    finalScore = Number.parseFloat(finalScore);
    speedScore = Number.parseFloat(speedScore);
    volumeScore = Number.parseFloat(volumeScore);
    recencyScore = Number.parseFloat(recencyScore);
    validationResult.responseTime = Number.parseFloat(validationResult.responseTime);

    logger.info(`${selectedType.name} - Miner ${validationResult.minerUID} Final Score: ${finalScore.toFixed(4)} - Speed: ${speedScore.toFixed(4)} (${validationResult.responseTime.toFixed(2)}s), Volume: ${volumeScore.toFixed(4)} (${validationResult.count} reviews), Recency: ${recencyScore.toFixed(4)}`);

    validationResult.score = Number.parseFloat(finalScore.toFixed(4));
    validationResult.components = {
      speedScore: Number.parseFloat(speedScore.toFixed(4)),
      volumeScore: Number.parseFloat(volumeScore.toFixed(4)),
      recencyScore: Number.parseFloat(recencyScore.toFixed(4))
    };
    validationResult.passedValidation = true;

    return validationResult;
  });

  // Extract just the scores for backward compatibility
  const scores = finalScores.map(result => result.score);

  // Calculate the mean score
   /* istanbul ignore next */
  const meanScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  logger.info(`${selectedType.name} - Scoring complete - Mean: ${meanScore.toFixed(4)}, Scores: [${scores.map(s => s.toFixed(4)).join(', ')}]`);

  /* istanbul ignore next */
  return {
    statistics: {
      count: scores?.length,
      mean: meanScore || 0,
      min: Math.min(...scores) || 0,
      max: Math.max(...scores) || 0
    },
    finalScores
  }
}

export default calculateFinalScores
