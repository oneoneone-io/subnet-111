import logger from '#modules/logger/index.js';

/**
 * Check if keyword is present in verified tweet (text, hashtags, or username)
 * @param {Object} verified - The verified tweet from Desearch API
 * @param {string} keyword - The keyword to search for (without quotes)
 * @returns {boolean} True if keyword is found
 */
const checkKeywordInVerified = (verified, keyword) => {
  const lowerKeyword = keyword.toLowerCase();
  
  // Check in tweet text
  if (verified.text && verified.text.toLowerCase().includes(lowerKeyword)) {
    return true;
  }
  
  // Check in hashtags (entities.hashtags array)
  if (verified.entities?.hashtags && Array.isArray(verified.entities.hashtags) &&
      verified.entities.hashtags.some(tag => tag.text && tag.text.toLowerCase().includes(lowerKeyword))) {
    return true;
  }
  
  // Check in username
  if (verified.user?.username && verified.user.username.toLowerCase().includes(lowerKeyword)) {
    return true;
  }
  
  return false;
};

/**
 * Validates a miner's submitted tweets against batch verification results by comparing
 * key fields like tweetId, username, userId, and dates. Also verifies keyword presence.
 *
 * @param {Array<Object>} tweets - List of original tweets submitted by the miner
 * @param {string} keyword - The keyword that should be present in tweets (with quotes, e.g., "bitcoin")
 * @param {number|string} minerUID - The unique identifier of the miner for logging purposes
 * @param {Map<string, Object>} verifiedTweetsMap - Map of verified tweets from Desearch API, keyed by tweetId
 * @returns {boolean} Returns true if all tweets pass validation, false otherwise
 */
const validateMinerAgainstBatch = (tweets, keyword, minerUID, verifiedTweetsMap) => {
  // Strip quotes from keyword for validation
  const cleanKeyword = keyword.replaceAll(/^"|"$/g, '');
  
  // Validate each tweet
  for (const original of tweets) {
    const verified = verifiedTweetsMap.get(original.tweetId);

    if (!verified) {
      logger.error(`X Tweets - UID ${minerUID}: Spot check failed: No verified tweet found for tweetId ${original.tweetId}`);
      return false;
    }

    // Check if tweet ID matches
    if (verified.id !== original.tweetId) {
      logger.error(`X Tweets - UID ${minerUID}: Spot check failed: ID mismatch for tweetId ${original.tweetId}`);
      return false;
    }

    // Check if keyword is present in verified tweet
    if (!checkKeywordInVerified(verified, cleanKeyword)) {
      logger.error(`X Tweets - UID ${minerUID}: Spot check failed: Keyword "${cleanKeyword}" not found in verified tweet ${original.tweetId}`);
      return false;
    }

    // Check if username matches (user.username from Desearch)
    if (verified.user?.username !== original.username) {
      logger.error(`X Tweets - UID ${minerUID}: Spot check failed: Username mismatch for tweetId ${original.tweetId} - expected ${original.username}, got ${verified.user?.username}`);
      return false;
    }

    // Check if user ID matches (user.id from Desearch)
    if (verified.user?.id !== original.userId) {
      logger.error(`X Tweets - UID ${minerUID}: Spot check failed: User ID mismatch for tweetId ${original.tweetId} - expected ${original.userId}, got ${verified.user?.id}`);
      return false;
    }

    // Check if dates match (created_at from Desearch)
    // Parse the Desearch date format: "Mon Oct 13 13:31:36 +0000 2025"
    const verifiedDate = new Date(verified.created_at);
    const originalDate = new Date(original.createdAt);
    
    // Truncate to seconds to avoid millisecond precision issues
    verifiedDate.setMilliseconds(0);
    originalDate.setMilliseconds(0);

    if (verifiedDate.toISOString() !== originalDate.toISOString()) {
      logger.error(`X Tweets - UID ${minerUID}: Spot check failed: Date mismatch for tweetId ${original.tweetId} - expected ${originalDate.toISOString()}, got ${verifiedDate.toISOString()}`);
      return false;
    }
  }

  return true;
}

export default validateMinerAgainstBatch
