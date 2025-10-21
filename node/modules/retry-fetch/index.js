import fetch from 'node-fetch';
import retryable from '#modules/retryable/index.js';

/**
 * Retryable fetch function that wraps node-fetch with retry logic
 * @param {string|URL} url - The URL to fetch
 * @param {RequestInit} [options] - Fetch options (method, headers, body, etc.)
 * @param {Object} [retryOptions] - Retry configuration options
 * @param {number} [retryOptions.maxRetries=3] - Maximum number of retry attempts
 * @param {number} [retryOptions.delay=1000] - Delay between retries in milliseconds
 * @param {Function} [retryOptions.shouldRetry] - Custom function to determine if a response should be retried
 * @returns {Promise<Response>} - The fetch response
 * @throws {Error} - Throws error if all retry attempts fail
 *
 * @example
 * // Basic usage with default retry settings
 * const response = await retryFetch('https://api.example.com/data');
 *
 * @example
 * // Custom retry configuration
 * const response = await retryFetch('https://api.example.com/data', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ key: 'value' })
 * }, {
 *   maxRetries: 5,
 *   delay: 2000,
 *   shouldRetry: (response) => response.status >= 500
 * });
 *
 * @example
 * // With custom retry logic for specific status codes
 * const response = await retryFetch('https://api.example.com/data', {}, {
 *   shouldRetry: (response) => {
 *     return response.status === 429 || response.status >= 500;
 *   }
 * });
 */
async function retryFetch(url, options = {}, retryOptions = {}) {
  const {
    maxRetries = 3,
    delay = 1000,
    shouldRetry = defaultShouldRetry
  } = retryOptions;

  /**
   * Internal fetch function that will be retried
   * @returns {Promise<Response>} - The fetch response
   */
  const fetchWithRetry = async () => {
    const response = await fetch(url, options);

    // Check if we should retry based on the response
    if (shouldRetry(response)) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  };

  const result = await retryable(fetchWithRetry, maxRetries, delay);

  if (result === undefined) {
    throw new Error(`Failed to fetch ${url} after ${maxRetries} retry attempts`);
  }

  return result;
}

/**
 * Default retry logic - retry on server errors (5xx) and rate limiting (429)
 * @param {Response} response - The fetch response
 * @returns {boolean} - Whether the request should be retried
 */
function defaultShouldRetry(response) {
  return response.status !== 200;
}

export default retryFetch;
