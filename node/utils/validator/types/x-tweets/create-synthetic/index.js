import config from '#config';
import logger from '#modules/logger/index.js';
import time from '#modules/time/index.js';
import random from '#modules/random/index.js';
import retryable from '#modules/retryable/index.js';
import { generateKeywordsFromChutes, generateKeywordsFromOpenRouter } from './generate-keywords.js';

/**
 * Create a synthetic task for X/Twitter tweets
 * It calls either Chutes or OpenRouter API to get keywords based on environment variable
 * It returns the keyword as the synthetic task metadata
 * If the API call fails after all retries, it throws an error
 * @returns {Promise<Object>} - The synthetic task with keyword
 */
const createSyntheticTask = async () => {
  const startTime = Date.now();

  logger.info(`X Tweets - Creating synthetic task`);

  try {
    // Determine which API to use based on environment variable
    const useOpenRouter = process.env.X_USE_OPENROUTER_TO_CREATE_SYNTHETIC === 'true';

    let keywords;

    if (useOpenRouter) {
      // Use OpenRouter API
      if (!process.env.OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY not configured');
      }

      logger.info('X Tweets - Calling OpenRouter API to generate keywords');
      keywords = await retryable(generateKeywordsFromOpenRouter, 3);
      logger.info(`X Tweets - Generated ${keywords.length} keywords from OpenRouter API`);
    } else {
      // Use Chutes API (default)
      if (!process.env.CHUTES_API_TOKEN) {
        throw new Error('CHUTES_API_TOKEN not configured');
      }

      logger.info('X Tweets - Calling Chutes API to generate keywords');
      keywords = await retryable(generateKeywordsFromChutes, 3);
      logger.info(`X Tweets - Generated ${keywords.length} keywords from Chutes API`);
    }

    // Pick a random keyword and wrap it in quotes
    const keyword = random.fromArray(keywords);
    const quotedKeyword = `"${keyword}"`;

    const duration = time.getDuration(startTime);
    logger.info(`X Tweets - Selected keyword: ${quotedKeyword} (took ${duration.toFixed(2)}s)`);

    // Return the synthetic task metadata with quoted keyword
    const metadata = {
      keyword: quotedKeyword
    }

    return {
      metadata,
      timeout: config.VALIDATOR.X_TWEETS.TWEETS_SYNAPSE_PARAMS.timeout
    };
  } catch (error) {
    const duration = time.getDuration(startTime);
    logger.error(`X Tweets - Error creating synthetic task (took ${duration.toFixed(2)}s):`, error);
    throw error;
  }
}

export default createSyntheticTask;

