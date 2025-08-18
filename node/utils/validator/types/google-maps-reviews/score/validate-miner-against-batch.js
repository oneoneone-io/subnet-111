import logger from '#modules/logger/index.js';

/**
 * Normalizes text values by converting null or undefined to undefined, preserving other values
 * @param {string|null|undefined} text - The text value to normalize
 * @returns {string|undefined} Returns undefined if input is null or undefined, otherwise returns the original text
 */
const normalizeNullableText = (text) => (text === null || text === undefined) ? undefined : text;

/**
 * Validates a miner's submitted reviews against batch verification results by comparing
 * key fields like reviewId, fid, reviewerId, placeId, review text, and dates.
 *
 * @param {Array<Object>} reviews - List of original reviews submitted by the miner
 * @param {string} fid - The Facility ID (FID) of the place that should match all reviews
 * @param {number|string} minerUID - The unique identifier of the miner for logging purposes
 * @param {Map<string, Object>} verifiedReviewsMap - Map of verified reviews from batch check, keyed by reviewId
 * @returns {boolean} Returns true if all reviews match their verified counterparts, false if any discrepancy is found
 *
 * @throws {Error} Implicitly may throw if date parsing fails
 *
 * @example
 * const reviews = [{ reviewId: '123', reviewerId: 'user1', placeId: 'place1', text: 'Great!', lastEditedAtDate: '2024-03-20' }];
 * const verifiedMap = new Map([['123', { reviewId: '123', reviewerId: 'user1', placeId: 'place1', text: 'Great!', publishedAtDate: '2024-03-20' }]]);
 * const result = validateMinerAgainstBatch(reviews, 'fid123', 'miner1', verifiedMap);
 */
const validateMinerAgainstBatch = (reviews, fid, minerUID, verifiedReviewsMap) => {
  // Compare each original review with its verified version by matching reviewId
  for (const original of reviews) {
    const verified = verifiedReviewsMap.get(original.reviewId);

    if (!verified) {
      logger.error(`Google Maps Reviews - UID ${minerUID}: Spot check failed: No verified review found for reviewId ${original.reviewId}`);
      return false;
    }

    // Check string fields that must match exactly
    const stringFieldsToCheck = [
      { field: 'fid', expected: fid },
      { field: 'reviewerId', expected: original.reviewerId },
      { field: 'placeId', expected: original.placeId }
    ];

    for (const { field, expected } of stringFieldsToCheck) {
      if (verified[field] !== expected) {
        logger.error(`Google Maps Reviews - UID ${minerUID}: Spot check failed: ${field} mismatch for reviewId ${original.reviewId} - expected ${expected}, got ${verified[field]}`);
        return false;
      }
    }

    // Check if review text matches (both null/undefined or both have same text)
    const originalText = normalizeNullableText(original.text);
    const verifiedText = normalizeNullableText(verified.text);

    if (originalText !== verifiedText) {
      logger.error(`Google Maps Reviews - UID ${minerUID}: Spot check failed: Text mismatch for reviewId ${original.reviewId}`);
      return false;
    }

    // Check if dates match - use lastEditedAtDate from original and publishedAtDate from verified since spot check actor returns lastEditedAtDate as publishedAtDate
    // We truncate milliseconds to avoid issues with different timestamps
    const originalDate = new Date(original.lastEditedAtDate);
    originalDate.setMilliseconds(0); // Truncate milliseconds
    const verifiedDate = new Date(verified.publishedAtDate);
    verifiedDate.setMilliseconds(0); // Truncate milliseconds

    if (originalDate.toISOString() !== verifiedDate.toISOString()) {
      logger.error(`Google Maps Reviews - UID ${minerUID}: Spot check failed: Date mismatch for reviewId ${original.reviewId}`);
      return false;
    }
  }

  return true;
}

export default validateMinerAgainstBatch
