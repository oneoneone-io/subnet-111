import logger from '#modules/logger/index.js';
import config from '#config';
import { prepareValidationResults } from '#utils/validator/validation-result.js';
import array from '#modules/array/index.js';
import random from '#modules/random/index.js';

/**
 * Checks if keyword is present in tweet body, hashtags, or username
 * @param {Object} tweet - The tweet object to check
 * @param {string} keyword - The keyword to search for
 * @returns {boolean} - True if keyword is found
 */
const checkKeywordPresence = (tweet, keyword) => {
  const keywordLower = keyword.toLowerCase();

  // Check in tweet text/body
  if (tweet.text && tweet.text.toLowerCase().includes(keywordLower)) {
    return true;
  }

  // Check in hashtags
  if (tweet.hashtags && Array.isArray(tweet.hashtags)) {
    for (const hashtag of tweet.hashtags) {
      if (typeof hashtag === 'string' && hashtag?.toLowerCase()?.includes(keywordLower)) {
        return true;
      }
    }
  }

  // Check in username
  if (tweet.username && tweet.username.toLowerCase().includes(keywordLower)) {
    return true;
  }

  return false;
};

/**
 * Selects tweets for spot checking - always includes the most recent tweet and random samples
 * @param {Array<Object>} tweets - Array of tweet objects
 * @param {string|number} minerUID - Unique identifier for the miner
 * @returns {Object} - Object containing mostRecentDate and selectedTweets
 */
const getTweetsForSpotCheck = (tweets, minerUID) => {
  // Early return if no tweets
  if (!tweets?.length) {
    return {
      mostRecentDate: undefined,
      selectedTweets: []
    }
  };

  // Early return if no spot check count
  const spotCheckCount = Math.min(config.VALIDATOR.X_TWEETS.SPOT_CHECK_COUNT, tweets.length);
  if (spotCheckCount === 0) {
    return {
      mostRecentDate: undefined,
      selectedTweets: []
    }
  };

  // Find most recent tweet
  let mostRecentTweet;
  let mostRecentDate;
  for (const tweet of tweets) {
    const tweetDate = new Date(tweet.createdAt);
    if (!mostRecentDate || tweetDate > mostRecentDate) {
      mostRecentDate = tweetDate;
      mostRecentTweet = tweet;
    }
  }

  // Log the most recent tweet selection
  logger.info(
    `X Tweets - UID ${minerUID}: Selected most recent tweet ${mostRecentTweet.tweetId} - (${mostRecentTweet.createdAt}) for spot check`
  );

  // If we only need one tweet, return just the most recent
  if (spotCheckCount === 1) {
    return {
      mostRecentDate,
      selectedTweets: [mostRecentTweet]
    };
  }

  // Get remaining tweets excluding the most recent one
  const remainingTweets = tweets.filter(tweet => tweet.tweetId !== mostRecentTweet.tweetId);

  // Select random tweets
  const randomTweets = random.shuffle(remainingTweets, spotCheckCount - 1);

  // Log random selections for spot check
  for (const tweet of randomTweets) {
    logger.info(
      `X Tweets - UID ${minerUID}: Selected random tweet ${tweet.tweetId} - (${tweet.createdAt}) for spot check`
    );
  }

  return {
    mostRecentDate,
    selectedTweets: [mostRecentTweet, ...randomTweets]
  }
};

/**
 * Processes and validates tweet responses
 * @param {Array<Array<Object>>} responses - Array of response arrays from different miners
 * @param {Array<string|number>} minerUIDs - Array of miner unique identifiers
 * @param {Array<number>} responseTimes - Array of response times
 * @param {number} synapseTimeout - The synapse timeout
 * @param {Object} metadata - The metadata containing the keyword
 * @param {string} typeId - The type ID
 * @returns {Array<Object>} - Array of validation results
 */
const prepareResponses = (
  responses,
  minerUIDs,
  responseTimes,
  synapseTimeout,
  metadata,
  typeId
) => {
  // Prepare the validation results
  const validationResults = prepareValidationResults(responses, minerUIDs, responseTimes, metadata, typeId);

  for (const [index, response] of responses.entries()) {
    const validationResult = validationResults[index];

    // Skip if the response is invalid
    if (validationResult.validationError) {
      continue;
    }

    // Data Cleaning - Remove duplicate tweets by tweetId
    const uniqueTweets = array.uniqueBy(response, 'tweetId');
    logger.info(`X Tweets - UID ${validationResult.minerUID}: Data cleaning - ${response.length} tweets -> ${uniqueTweets.length} unique tweets`);

    // Structural Validation - Check required fields and types
    const requiredFields = [
      // Core required fields
      { name: 'tweetId', type: 'string' },
      { name: 'username', type: 'string' },
      { name: 'text', type: 'string' },
      { name: 'createdAt', type: 'string' },
      { name: 'tweetUrl', type: 'string' },
      { name: 'hashtags', type: 'object' }, // Array is type 'object' in JavaScript

      // Additional required fields from Gravity API
      { name: 'userId', type: 'string' },
      { name: 'displayName', type: 'string' },
      { name: 'followersCount', type: 'number' },
      { name: 'followingCount', type: 'number' },
      { name: 'verified', type: 'boolean' }
      // Note: userDescription is optional and not validated as it can be null
    ];

    // Validate the tweets
    const { valid: validTweets, invalid } = array.validateArray(uniqueTweets, requiredFields);

    // If there are invalid tweets, set the validation error and skip
    if (invalid.length > 0) {
      validationResult.validationError = 'Structural validation failed on tweet objects';
      continue;
    }

    logger.info(`X Tweets - UID ${validationResult.minerUID}: Structural validation passed - ${validTweets.length} tweets validated successfully`);

    // Keyword validation - check if keyword is present in tweets
    // Strip quotes from keyword for validation (keyword is sent as "keyword" to miners)
    const cleanKeyword = metadata.keyword.replaceAll(/^"|"$/g, '');
    const tweetsWithKeyword = validTweets.filter(tweet =>
      checkKeywordPresence(tweet, cleanKeyword)
    );

    if (tweetsWithKeyword.length === 0) {
      validationResult.validationError = 'No tweets contain the required keyword';
      continue;
    }

    logger.info(`X Tweets - UID ${validationResult.minerUID}: Keyword validation passed - ${tweetsWithKeyword.length}/${validTweets.length} tweets contain keyword ${metadata.keyword}`);

    const { mostRecentDate, selectedTweets } = getTweetsForSpotCheck(tweetsWithKeyword, validationResult.minerUID);

    // Store validation data and selected tweets for batch processing
    validationResult.count = tweetsWithKeyword.length;
    validationResult.mostRecentDate = mostRecentDate;
    validationResult.data = selectedTweets;
    validationResult.allValidatedItems = tweetsWithKeyword;
    validationResult.passedValidation = true;
  }

  return validationResults
}

export {
  prepareResponses,
  getTweetsForSpotCheck,
  checkKeywordPresence
}

