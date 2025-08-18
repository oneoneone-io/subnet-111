import logger from '#modules/logger/index.js';
import config from '#config';
import { prepareValidationResults } from '#utils/validator/validation-result.js';
import array from '#modules/array/index.js';

/**
 * Selects a subset of reviews for spot checking, including the most recent review and random samples.
 * The function ensures that the most recent review is always included in the selection, and the remaining
 * reviews are randomly selected from the rest of the available reviews.
 *
 * @param {Array<Object>} reviews - Array of review objects to select from
 * @param {string} reviews[].reviewId - Unique identifier for each review
 * @param {string} reviews[].publishedAtDate - ISO date string of when the review was published
 * @param {string} fid - Facility ID associated with the reviews
 * @param {string|number} minerUID - Unique identifier for the miner, used for logging purposes
 *
 * @returns {Object} An object containing the selected reviews and most recent date
 * @returns {Date|undefined} .mostRecentDate - Date object of the most recent review, or undefined if no reviews
 * @returns {Array<Object>} .selectedReviews - Array of selected review objects for spot checking
 *                                             Contains at most config.VALIDATOR.SPOT_CHECK_COUNT reviews,
 *                                             always including the most recent review if available
 *
 * @example
 * const result = getReviewsForSpotCheck([
 *   { reviewId: '1', publishedAtDate: '2024-03-20' },
 *   { reviewId: '2', publishedAtDate: '2024-03-19' }
 * ], 'facility123', 'miner456');
 * // Returns { mostRecentDate: Date('2024-03-20'), selectedReviews: [...] }
 */
const getReviewsForSpotCheck = (reviews, minerUID) => {
  // Early return if no reviews
  if (!reviews?.length) {
    return {
      mostRecentDate: undefined,
      selectedReviews: []
    }
  };

  // Early return if no spot check count
  const spotCheckCount = Math.min(config.VALIDATOR.SPOT_CHECK_COUNT, reviews.length);
  if (spotCheckCount === 0) {
    return {
      mostRecentDate: undefined,
      selectedReviews: []
    }
  };

  // Find most recent review
  let mostRecentReview;
  let mostRecentDate;
  for (const review of reviews) {
    const reviewDate = new Date(review.publishedAtDate);
    if (!mostRecentDate || reviewDate > mostRecentDate) {
      mostRecentDate = reviewDate;
      mostRecentReview = review;
    }
  }

  // Log the most recent review selection
  logger.info(
    `Google Maps Reviews - UID ${minerUID}: Selected most recent review ${mostRecentReview.reviewId} - (${mostRecentReview.publishedAtDate}) for spot check`
  );

  // If we only need one review, return just the most recent
  if (spotCheckCount === 1) {
    return {
      mostRecentDate,
      selectedReviews: [mostRecentReview]
    };
  }

  // Get remaining reviews excluding the most recent one
  const remainingReviews = reviews.filter(review => review.reviewId !== mostRecentReview.reviewId);

  // Select random reviews with the number of spot check count - 1
  const randomReviews = remainingReviews
    .sort(() => Math.random() - 0.5)  // Fisher-Yates shuffle in place
    .slice(0, spotCheckCount - 1);

  // Log random selections for spot check
  for (const review of randomReviews) {
    logger.info(
      `Google Maps Reviews - UID ${minerUID}: Selected random review ${review.reviewId} - (${review.publishedAtDate}) for spot check`
    );
  }

  return {
    mostRecentDate,
    selectedReviews: [mostRecentReview, ...randomReviews]
  }
};

/**
 * Processes and validates an array of Google Maps review responses, performing data cleaning,
 * structural validation, and selecting reviews for spot checking.
 *
 * @param {Array<Array<Object>>} responses - Array of response arrays from different miners, where each response
 *                                          contains review objects
 * @param {Array<string|number>} minerUIDs - Array of miner unique identifiers corresponding to each response
 * @param {Array<number>} responseTimes - Array of response times corresponding to each response
 * @param {number} synapseTimeout - The synapse timeout
 *
 * @returns {Object} An object containing validation results and selected reviews for spot checking
 * @returns {Array<Object>} .validationResults - Array of validation results for each miner
 * @returns {Array<Object>} .validationResults[].minerUID - The miner's unique identifier
 * @returns {boolean} .validationResults[].passedValidation - Whether the miner's response passed all validations
 * @returns {string} [.validationResults[].validationError] - Error message if validation failed
 * @returns {number} [.validationResults[].count] - Number of valid reviews if validation passed
 * @returns {Date} [.validationResults[].mostRecentDate] - Date of the most recent review if validation passed
 * @returns {Array<Object>} [.validationResults[].data] - Selected reviews for spot checking if validation passed
 *
 * @example
 * const responses = [
 *   [
 *     {
 *       reviewerId: '123',
 *       reviewerUrl: 'https://...',
 *       reviewerName: 'John Doe',
 *       reviewId: 'rev123',
 *       reviewUrl: 'https://...',
 *       publishedAtDate: '2024-03-20',
 *       placeId: 'place123',
 *       cid: 'cid123',
 *       fid: 'facility123',
 *       totalScore: 5
 *     }
 *   ]
 * ];
 * const minerUIDs = ['miner1'];
 * const fid = 'facility123';
 *
 * const result = prepareResponses(responses, minerUIDs, fid);
 * // Returns [{
 * //     minerUID: 'miner1',
 * //     passedValidation: true,
 * //     count: 1,
 * //     mostRecentDate: Date('2024-03-20'),
 * //     data: [...]
 * //   }]
 */
const prepareResponses = (
  responses, 
  minerUIDs, 
  responseTimes,
  synapseTimeout,
  metadata
) => {
  // Prepare the validation results
  const validationResults = prepareValidationResults('Google Maps Reviews', responses, minerUIDs, responseTimes, synapseTimeout);

  for (const [index, response] of responses.entries()) {
    const validationResult = validationResults[index];

    // Skip if the response is invalid
    if (validationResult.validationError) {
      continue;
    }

    // Data Cleaning - Remove duplicate reviews by reviewId
    const uniqueReviews = array.uniqueBy(response, 'reviewId');
    logger.info(`Google Maps Reviews - UID ${validationResult.minerUID}: Data cleaning - ${response.length} reviews -> ${uniqueReviews.length} unique reviews`);

    // Structural Validation - Check required fields and types
    const requiredFields = [
      { name: 'reviewerId', type: 'string' },
      { name: 'reviewerUrl', type: 'string' },
      { name: 'reviewerName', type: 'string' },
      { name: 'reviewId', type: 'string' },
      { name: 'reviewUrl', type: 'string' },
      { name: 'publishedAtDate', type: 'string' },
      { name: 'placeId', type: 'string' },
      { name: 'cid', type: 'string' },
      { name: 'fid', type: 'string' },
      { name: 'totalScore', type: 'number' },
      { name: 'fid', type: 'string', validate: (value) => value === metadata.fid }
    ];

    // Validate the reviews
    const { valid: validReviews, invalid } = array.validateArray(uniqueReviews, requiredFields);

    // If there are invalid reviews, set the validation error and skip
    if (invalid.length > 0) {
      validationResult.validationError = 'Structural validation failed on review objects';
      continue;
    }

    logger.info(`Google Maps Reviews - UID ${validationResult.minerUID}: Structural validation passed - ${validReviews.length} reviews validated successfully`);

    const { mostRecentDate, selectedReviews } = getReviewsForSpotCheck(validReviews, validationResult.minerUID);

    // Store validation data and selected reviews for batch processing
    validationResult.count = validReviews.length;
    validationResult.mostRecentDate = mostRecentDate;
    validationResult.data = selectedReviews;
    validationResult.passedValidation = true;
  }

  return validationResults
}

export {
  prepareResponses,
  getReviewsForSpotCheck
}
