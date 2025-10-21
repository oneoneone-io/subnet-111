import logger from '#modules/logger/index.js';
import config from '#config';
import retryable from '#modules/retryable/index.js';
import retryFetch from '#modules/retry-fetch/index.js';

/**
 * Parse Gravity API response to extract required tweet fields
 * Filters out tweets that don't have all required fields
 * @param {Array} data - The data array from Gravity API response
 * @returns {Array} Array of parsed and validated tweet objects
 */
function parseGravityResponse(data) {
  const parsedTweets = [];

  for (const item of data) {
    // Check if all required fields are present and valid
    if (!item.tweet?.id ||
        !item.user?.username ||
        !item.text ||
        !item.datetime ||
        !item.uri ||
        !item.user?.id ||
        !item.user?.display_name ||
        typeof item.user?.followers_count !== 'number' ||
        typeof item.user?.following_count !== 'number' ||
        typeof item.user?.verified !== 'boolean'
      ) {
      // Skip this tweet if any required field is missing or invalid
      continue;
    }

    const tweet = {
      // Required fields for validation
      tweetId: item.tweet.id,
      username: item.user.username,
      text: item.text,
      createdAt: item.datetime,
      tweetUrl: item.uri,
      hashtags: item.tweet.hashtags || [],

      // Additional required fields
      userId: item.user.id,
      displayName: item.user.display_name,
      followersCount: item.user.followers_count,
      followingCount: item.user.following_count,
      verified: item.user.verified
    };

    // Only include userDescription if it's not null
    if (item.user.user_description !== null && item.user.user_description !== undefined) {
      tweet.userDescription = item.user.user_description;
    }

    parsedTweets.push(tweet);
  }

  return parsedTweets;
}

/**
 * Fetches X/Twitter tweets for a given keyword using the Gravity API from Macrocosmos.
 *
 * This function retrieves tweets for a specific keyword.
 * It uses the configured Gravity API to fetch tweets with retry logic for reliability.
 * The number of tweets fetched is determined by the GRAVITY_TWEET_LIMIT environment variable.
 *
 * @example
 * ```javascript
 * const tweets = await fetch({
 *   keyword: 'bitcoin'
 * });
 * ```
 *
 * @param {Object} parameters - The parameters for fetching tweets
 * @param {string} parameters.keyword - The keyword to search for tweets
 * @returns {Promise<Array>} A promise that resolves to an array of tweet objects
 * @throws {Error} Throws an error if the Gravity API fails or if there are network issues
 *
 * @description
 * - Uses retryable wrapper with up to 10 retry attempts for reliability
 * - Logs detailed information about the fetch process
 * - Tweet count is configured via GRAVITY_TWEET_LIMIT environment variable
 * - Utilizes the configured Gravity API from `config.MINER.X_TWEETS.GRAVITY_API_URL`
 */
const fetchTweets = async ({ keyword }) => {
  try {
    // Check for required environment variables
    if (!process.env.GRAVITY_API_TOKEN) {
      throw new Error('GRAVITY_API_TOKEN not configured');
    }

    if (!process.env.GRAVITY_TWEET_LIMIT) {
      throw new Error('GRAVITY_TWEET_LIMIT not configured');
    }

    const tweetLimit = Number.parseInt(process.env.GRAVITY_TWEET_LIMIT, 10);

    // Strip quotes from keyword (validator sends it as "keyword")
    const cleanKeyword = keyword.replaceAll(/^"|"$/g, '');

    logger.info(`[Miner] Fetching tweets - Keyword: ${keyword}, Limit: ${tweetLimit}`);

    // Run the Gravity API and get the results
    logger.info(`[Miner] Starting Gravity API for tweets fetch...`);
    const items = await retryable(async () => {
      const response = await retryFetch(config.MINER.X_TWEETS.GRAVITY_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GRAVITY_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          source: 'X',
          keywords: [cleanKeyword],
          limit: tweetLimit,
          keyword_mode: config.MINER.X_TWEETS.GRAVITY_KEYWORD_MODE
        })
      });

      if (!response.ok) {
        throw new Error(`Gravity API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      // Check if the response is successful
      if (result.status !== 'success') {
        throw new Error(`Gravity API returned non-success status: ${result.status}`);
      }

      // Parse and return the data
      const parsedTweets = parseGravityResponse(result.data || []);
      logger.info(`[Miner] Successfully fetched ${parsedTweets.length} tweets from Gravity API`);

      return parsedTweets;
    }, 10);

    // Return structured response with tweets
    return items;
  } catch (error) {
    logger.error(`[Miner] Error fetching tweets:`, error);
    throw error;
  }
}

export default fetchTweets

