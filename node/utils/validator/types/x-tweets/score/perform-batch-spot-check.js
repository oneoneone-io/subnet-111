import logger from '#modules/logger/index.js';
import time from '#modules/time/index.js';
import array from '#modules/array/index.js';
import getTweetsWithGuestToken from './get-tweets-with-guest-token.js';
import getTweetsFromDesearch from './get-tweets-from-desearch.js';

/**
 * Perform batch spot check on tweets from all miners by verifying them against Desearch API or Twitter guest token API.
 * This function takes tweets from multiple miners and validates their authenticity by checking
 * them against the actual X/Twitter data.
 *
 * @param {Array} selectedSpotCheckTweets - Array of objects containing miner information and their tweets
 * @param {string} keyword - The keyword used for the synthetic task
 * @returns {Promise<Map>} - Returns a Map where keys are tweet IDs and values are verification results
 */
const performBatchSpotCheck = async (selectedSpotCheckTweets, keyword) => {
  const startTime = Date.now();
  const useGuestToken = process.env.USE_GUEST_TOKEN === 'true';

  try {
    // Collect all unique tweet IDs from all miners
    const tweetIds = array.unique(
      selectedSpotCheckTweets.flatMap(selectedTweet =>
        selectedTweet.tweets.map(tweet => tweet.tweetId)
      )
    );

    const method = useGuestToken ? 'Guest Token' : 'Desearch';
    logger.info(`X Tweets - Batch spot check (${method}): Verifying ${tweetIds.length} unique tweets from ${selectedSpotCheckTweets.length} miners for keyword: ${keyword}`);

    const results = await (useGuestToken ? getTweetsWithGuestToken(tweetIds) : getTweetsFromDesearch(tweetIds));

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

