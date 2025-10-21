import logger from '#modules/logger/index.js';
import time from '#modules/time/index.js';
import config from '#config';
import retryFetch from '#modules/retry-fetch/index.js';
import retryable from '#modules/retryable/index.js';
import array from '#modules/array/index.js';

/**
 * Perform batch spot check on tweets from all miners by verifying them against Desearch API.
 * This function takes tweets from multiple miners and validates their authenticity by checking
 * them against the actual X/Twitter data using Desearch API.
 *
 * @param {Array} selectedSpotCheckTweets - Array of objects containing miner information and their tweets
 * @param {string} keyword - The keyword used for the synthetic task
 * @returns {Promise<Map>} - Returns a Map where keys are tweet IDs and values are verification results
 */
const performBatchSpotCheck = async (selectedSpotCheckTweets, keyword) => {
  const startTime = Date.now();

  try {
    // Check if API token is configured
    if (!process.env.DESEARCH_API_TOKEN) {
      throw new Error('DESEARCH_API_TOKEN not configured');
    }

    // Collect all unique tweet IDs from all miners
    const tweetIds = array.unique(
      selectedSpotCheckTweets.flatMap(selectedTweet =>
        selectedTweet.tweets.map(tweet => tweet.tweetId)
      )
    );

    logger.info(`X Tweets - Batch spot check: Verifying ${tweetIds.length} unique tweets from ${selectedSpotCheckTweets.length} miners for keyword: ${keyword}`);

    // Make API calls for each tweet ID with retry logic
    const verificationPromises = tweetIds.map(async (tweetId) => {
      try {
        const data = await retryable(async () => {
          const response = await retryFetch(`${config.VALIDATOR.X_TWEETS.DESEARCH_API_URL}?id=${tweetId}`, {
            method: 'GET',
            headers: {
              'accept': 'application/json',
              'content-type': 'application/json',
              'Authorization': process.env.DESEARCH_API_TOKEN
            }
          });

          if (!response.ok) {
            throw new Error(`Desearch API error: ${response.status} ${response.statusText}`);
          }

          return response.json();
        }, 3);

        return data;
      } catch (error) {
        logger.warning(`X Tweets - Error fetching tweet ${tweetId} from Desearch after retries:`, error.message);
        return;
      }
    });

    // Wait for all verification requests to complete
    const results = await Promise.all(verificationPromises);

    // Filter out failed results and create a map of verified tweets by tweetId
    const verifiedTweets = new Map();
    for (const verified of results) {
      if (verified && verified.id) {
        verifiedTweets.set(verified.id, verified);
      }
    }

    const duration = time.getDuration(startTime);
    logger.info(`X Tweets - Batch spot check complete: Verified ${verifiedTweets.size}/${tweetIds.length} tweets in ${duration.toFixed(2)}s`);

    return verifiedTweets;
  } catch (error) {
    const duration = time.getDuration(startTime);
    logger.error(`X Tweets - Batch spot check failed with error (took ${duration.toFixed(2)}s):`, error);
    throw error;
  }
}

export default performBatchSpotCheck

