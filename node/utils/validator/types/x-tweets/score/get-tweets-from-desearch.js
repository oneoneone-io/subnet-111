import retryFetch from '#modules/retry-fetch/index.js';
import retryable from '#modules/retryable/index.js';
import config from '#config';
import logger from '#modules/logger/index.js';

/**
 * Get tweets from Desearch API
 * @param {Array} tweetIds - Array of tweet IDs to fetch
 * @returns {Promise<Array>} Array of tweets from Desearch API with retry logic
 */
const getTweetsFromDesearch = async (tweetIds) => {
  // Check if API token is configured
  if (!process.env.DESEARCH_API_TOKEN) {
    throw new Error('DESEARCH_API_TOKEN not configured');
  }

  // Make API calls using Desearch with retry logic
  const promises = tweetIds.map(async (tweetId) => {
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

  return Promise.all(promises);
}

export default getTweetsFromDesearch;
