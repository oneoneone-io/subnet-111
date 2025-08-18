import logger from '#modules/logger/index.js';
import time from '#modules/time/index.js';
import apify from '#modules/apify/index.js';
import config from '#config';

/**
 * Perform batch spot check on reviews from all miners by verifying them against Google Maps.
 * This function takes reviews from multiple miners and validates their authenticity by checking
 * them against the actual Google Maps data using Apify actor.
 *
 * @param {Array} selectedSpotCheckReviews - Array of objects containing miner information and their reviews. Each object has format {minerUID: string, reviews: Array<{reviewUrl: string, ...}>}
 * @param {string} fid - The FID (Facility ID) of the place in Google Maps to verify reviews against
 * @returns {Promise<Object>} - Returns a Map where keys are review IDs and values are verification results containing details about whether the review exists and matches the submitted data
 */
const performBatchSpotCheck = async (selectedSpotCheckReviews, fid) => {
  const startTime = Date.now();

  try {
    // Collect all unique URLs from all miners
    const startUrls = selectedSpotCheckReviews
      .flatMap(selectedReview => selectedReview.reviews.map(review => ({
        url: review.reviewUrl,
        method: "GET"
      }))
    );

    logger.info(`Google Maps Reviews - Batch spot check: Verifying ${startUrls.length} reviews from ${selectedSpotCheckReviews.length} miners for fid: ${fid}`);

    // Make one batch call to Apify with all URLs
    const results = await apify.runActorAndGetResults(
      config.VALIDATOR.GOOGLE_MAPS_REVIEWS.APIFY_ACTORS.SPOT_CHECK,
      {
        startUrls,
      }
    );

    // Create a map of verified reviews by reviewId for easy lookup
    const verifiedReviews = new Map();
    for (const verified of results) {
      if (verified.reviewId) {
        verifiedReviews.set(verified.reviewId, verified);
      }
    }

    const duration = time.getDuration(startTime);
    logger.info(`Google Maps Reviews - Batch spot check complete: Verified ${results.length} reviews in ${duration.toFixed(2)}s`);

    return verifiedReviews;
  } catch (error) {
    const duration = time.getDuration(startTime);
    logger.error(`Google Maps Reviews - Batch spot check failed with error (took ${duration.toFixed(2)}s):`, error);
    throw error;
  }
}

export default performBatchSpotCheck
