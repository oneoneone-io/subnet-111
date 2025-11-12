import retryable from '#modules/retryable/index.js';
import config from '#config';
import logger from '#modules/logger/index.js';
import apify from '#modules/apify/index.js';

function parseApifyResponse(items) {
  return items.filter(item => !item.noResults).map(item => {
    return {
      id: item.id,
      text: item.text,
      created_at: item.createdAt,
      user: {
        id: item.author.id,
        username: item.author.userName
      },
      entities: {
        hashtags: item.entities.hashtags || []
      }
    };
  });
}

/**
 * Get tweets from Desearch API
 * @param {Array} tweetIds - Array of tweet IDs to fetch
 * @returns {Promise<Array>} Array of tweets from Desearch API with retry logic
 */
const getTweetsFromApify = async (tweetIds) => {
  // Check if API token is configured
  if (!process.env.APIFY_TOKEN) {
    throw new Error('APIFY_TOKEN not configured');
  }

  const items = await retryable(async () => {
    return await apify.runActorAndGetResults(config.VALIDATOR.X_TWEETS.APIFY_ACTORS.SPOT_CHECK, {
      startUrls: tweetIds.map(tweetId => `http://x.com/x/status/${tweetId}`),
      maxItems: tweetIds.length,
      maxRequestRetries: 5,
      batch: true
    });
  }, 10);

  logger.info(`X Tweets - Fetched ${items.length} tweets from Apify`);

  return parseApifyResponse(items);
}

export default getTweetsFromApify;
