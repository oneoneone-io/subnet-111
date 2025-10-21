import logger from '#modules/logger/index.js';

/**
 * Retry a function
 * @param {Function} function_ - The function to retry
 * @param {number} maxRetries - The maximum number of retries
 * @param {number} delay - The delay between retries
 * @returns {Promise<any>} - The result of the function
 */
async function retryable(function_, maxRetries = 3, delay = 1000) {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      return await function_();
    } catch (error) {
      logger.error(`${retries + 1}/${maxRetries} - Retryable function failed: ${error.message}`);
      retries++;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return;
}

export default retryable;
