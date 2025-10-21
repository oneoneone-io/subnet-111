import logger from '#modules/logger/index.js';
import time from '#modules/time/index.js';
import config from '#config';
import retryFetch from '#modules/retry-fetch/index.js';
import retryable from '#modules/retryable/index.js';
import array from '#modules/array/index.js';
import performBatchSpotCheck from './perform-batch-spot-check.js';

jest.mock('#modules/logger/index.js', () => ({
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
}));
jest.mock('#modules/time/index.js', () => ({
  getDuration: jest.fn(),
}));
jest.mock('#config');
jest.mock('#modules/retry-fetch/index.js');
jest.mock('#modules/retryable/index.js');
jest.mock('#modules/array/index.js');

describe('#utils/validator/types/x-tweets/score/perform-batch-spot-check.js', () => {
  const originalEnvironment = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnvironment };

    // Mock config
    config.VALIDATOR = {
      X_TWEETS: {
        DESEARCH_API_URL: 'https://api.dresearch.com/tweets'
      }
    };

    // Mock time.getDuration to return a fixed value
    time.getDuration.mockReturnValue(2.5);
  });

  afterEach(() => {
    process.env = originalEnvironment;
  });

  test('should perform batch spot check successfully', async () => {
    const selectedSpotCheckTweets = [
      {
        minerUID: 'miner1',
        tweets: [
          { tweetId: '1', text: 'Tweet 1' },
          { tweetId: '2', text: 'Tweet 2' }
        ]
      },
      {
        minerUID: 'miner2',
        tweets: [
          { tweetId: '2', text: 'Tweet 2' }, // Duplicate
          { tweetId: '3', text: 'Tweet 3' }
        ]
      }
    ];

    const keyword = '"test-keyword"';

    // Mock array.unique to return unique tweet IDs
    array.unique.mockReturnValue(['1', '2', '3']);

    // Mock retryable to return successful responses
    const mockVerifiedTweets = [
      { id: '1', text: 'Tweet 1', user: { username: 'user1' } },
      { id: '2', text: 'Tweet 2', user: { username: 'user2' } },
      { id: '3', text: 'Tweet 3', user: { username: 'user3' } }
    ];

    retryable.mockImplementation(async (function_) => {
      const response = await function_();
      return response;
    });

    retryFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockVerifiedTweets[0])
    });

    process.env.DESEARCH_API_TOKEN = 'test-token';

    const result = await performBatchSpotCheck(selectedSpotCheckTweets, keyword);

    expect(array.unique).toHaveBeenCalledWith(['1', '2', '2', '3']);
    expect(logger.info).toHaveBeenCalledWith(
      'X Tweets - Batch spot check: Verifying 3 unique tweets from 2 miners for keyword: "test-keyword"'
    );
    expect(retryFetch).toHaveBeenCalledWith(
      'https://api.dresearch.com/tweets?id=1',
      expect.objectContaining({
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'Authorization': 'test-token'
        }
      })
    );
    expect(logger.info).toHaveBeenCalledWith(
      'X Tweets - Batch spot check complete: Verified 1/3 tweets in 2.50s'
    );
    expect(result).toBeInstanceOf(Map);
  });

  test('should throw error when DESEARCH_API_TOKEN is not configured', async () => {
    delete process.env.DESEARCH_API_TOKEN;

    const selectedSpotCheckTweets = [
      { minerUID: 'miner1', tweets: [{ tweetId: '1', text: 'Tweet 1' }] }
    ];

    await expect(performBatchSpotCheck(selectedSpotCheckTweets, '"test"')).rejects.toThrow(
      'DESEARCH_API_TOKEN not configured'
    );
  });

  test('should handle API errors and continue with other tweets', async () => {
    const selectedSpotCheckTweets = [
      {
        minerUID: 'miner1',
        tweets: [{ tweetId: '1', text: 'Tweet 1' }]
      }
    ];

    array.unique.mockReturnValue(['1']);

    // Mock retryable to throw error
    retryable.mockRejectedValue(new Error('API error'));

    process.env.DESEARCH_API_TOKEN = 'test-token';

    const result = await performBatchSpotCheck(selectedSpotCheckTweets, '"test"');

    expect(logger.warning).toHaveBeenCalledWith(
      'X Tweets - Error fetching tweet 1 from Desearch after retries:',
      'API error'
    );
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
  });

  test('should handle non-ok API responses', async () => {
    const selectedSpotCheckTweets = [
      {
        minerUID: 'miner1',
        tweets: [{ tweetId: '1', text: 'Tweet 1' }]
      }
    ];

    array.unique.mockReturnValue(['1']);

    retryable.mockImplementation(async (function_) => {
      const response = await function_();
      return response;
    });

    retryFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    });

    process.env.DESEARCH_API_TOKEN = 'test-token';

    // The error is caught and logged, function returns empty map
    const result = await performBatchSpotCheck(selectedSpotCheckTweets, '"test"');

    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
    expect(logger.warning).toHaveBeenCalledWith(
      'X Tweets - Error fetching tweet 1 from Desearch after retries:',
      'Desearch API error: 404 Not Found'
    );
  });

  test('should filter out failed results', async () => {
    const selectedSpotCheckTweets = [
      {
        minerUID: 'miner1',
        tweets: [{ tweetId: '1', text: 'Tweet 1' }]
      }
    ];

    array.unique.mockReturnValue(['1']);

    // Mock retryable to return undefined (failed result)
    retryable.mockResolvedValue();

    process.env.DESEARCH_API_TOKEN = 'test-token';

    const result = await performBatchSpotCheck(selectedSpotCheckTweets, '"test"');

    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
  });

  test('should handle tweets without id field', async () => {
    const selectedSpotCheckTweets = [
      {
        minerUID: 'miner1',
        tweets: [{ tweetId: '1', text: 'Tweet 1' }]
      }
    ];

    array.unique.mockReturnValue(['1']);

    retryable.mockImplementation(async (function_) => {
      const response = await function_();
      return response;
    });

    retryFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ text: 'Tweet without id' })
    });

    process.env.DESEARCH_API_TOKEN = 'test-token';

    const result = await performBatchSpotCheck(selectedSpotCheckTweets, '"test"');

    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
  });

  test('should handle general errors and log them', async () => {
    const selectedSpotCheckTweets = [
      {
        minerUID: 'miner1',
        tweets: [{ tweetId: '1', text: 'Tweet 1' }]
      }
    ];

    array.unique.mockImplementation(() => {
      throw new Error('Array processing error');
    });

    process.env.DESEARCH_API_TOKEN = 'test-token';

    await expect(performBatchSpotCheck(selectedSpotCheckTweets, '"test"')).rejects.toThrow(
      'Array processing error'
    );

    expect(logger.error).toHaveBeenCalledWith(
      'X Tweets - Batch spot check failed with error (took 2.50s):',
      expect.any(Error)
    );
  });
});
