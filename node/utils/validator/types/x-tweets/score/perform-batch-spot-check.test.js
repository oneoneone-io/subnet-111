import logger from '#modules/logger/index.js';
import time from '#modules/time/index.js';
import array from '#modules/array/index.js';
import performBatchSpotCheck from './perform-batch-spot-check.js';
import getTweetsFromApify from './get-tweets-from-apify.js';
import getTweetsFromDesearch from './get-tweets-from-desearch.js';

jest.mock('#modules/logger/index.js', () => ({
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
}));
jest.mock('#modules/time/index.js', () => ({
  getDuration: jest.fn(),
}));
jest.mock('#modules/array/index.js');
jest.mock('./get-tweets-from-apify.js');
jest.mock('./get-tweets-from-desearch.js');

describe('#utils/validator/types/x-tweets/score/perform-batch-spot-check.js', () => {
  const originalEnvironment = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnvironment };

    // Mock time.getDuration to return a fixed value
    time.getDuration.mockReturnValue(2.5);
  });

  afterEach(() => {
    process.env = originalEnvironment;
  });

  test('should perform batch spot check successfully with Desearch', async () => {
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

    // Mock getTweetsFromDesearch to return successful responses
    const mockVerifiedTweets = [
      { id: '1', text: 'Tweet 1', user: { username: 'user1' } },
      { id: '2', text: 'Tweet 2', user: { username: 'user2' } },
      { id: '3', text: 'Tweet 3', user: { username: 'user3' } }
    ];

    getTweetsFromDesearch.mockResolvedValue(mockVerifiedTweets);

    const result = await performBatchSpotCheck(selectedSpotCheckTweets, keyword);

    expect(array.unique).toHaveBeenCalledWith(['1', '2', '2', '3']);
    expect(logger.info).toHaveBeenCalledWith(
      'X Tweets - Batch spot check (Desearch): Verifying 3 unique tweets from 2 miners for keyword: "test-keyword"'
    );
    expect(getTweetsFromDesearch).toHaveBeenCalledWith(['1', '2', '3']);
    expect(logger.info).toHaveBeenCalledWith(
      'X Tweets - Batch spot check complete: Verified 3/3 tweets in 2.50s'
    );
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(3);
  });

  test('should perform batch spot check successfully with Apify', async () => {
    process.env.X_USE_APIFY_TO_SPOT_CHECK = 'true';

    const selectedSpotCheckTweets = [
      {
        minerUID: 'miner1',
        tweets: [
          { tweetId: '1', text: 'Tweet 1' },
          { tweetId: '2', text: 'Tweet 2' }
        ]
      }
    ];

    const keyword = '"test-keyword"';

    // Mock array.unique to return unique tweet IDs
    array.unique.mockReturnValue(['1', '2']);

    // Mock getTweetsFromApify to return successful responses
    const mockVerifiedTweets = [
      { id: '1', text: 'Tweet 1', user: { username: 'user1' } },
      { id: '2', text: 'Tweet 2', user: { username: 'user2' } }
    ];

    getTweetsFromApify.mockResolvedValue(mockVerifiedTweets);

    const result = await performBatchSpotCheck(selectedSpotCheckTweets, keyword);

    expect(array.unique).toHaveBeenCalledWith(['1', '2']);
    expect(logger.info).toHaveBeenCalledWith(
      'X Tweets - Batch spot check (Apify): Verifying 2 unique tweets from 1 miners for keyword: "test-keyword"'
    );
    expect(getTweetsFromApify).toHaveBeenCalledWith(['1', '2']);
    expect(logger.info).toHaveBeenCalledWith(
      'X Tweets - Batch spot check complete: Verified 2/2 tweets in 2.50s'
    );
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(2);
  });

  test('should filter out failed results', async () => {
    const selectedSpotCheckTweets = [
      {
        minerUID: 'miner1',
        tweets: [{ tweetId: '1', text: 'Tweet 1' }]
      }
    ];

    array.unique.mockReturnValue(['1']);

    // Mock getTweetsFromDesearch to return undefined (failed result)
    getTweetsFromDesearch.mockResolvedValue([undefined]);

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

    // Mock getTweetsFromDesearch to return tweet without id
    getTweetsFromDesearch.mockResolvedValue([{ text: 'Tweet without id' }]);

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

    await expect(performBatchSpotCheck(selectedSpotCheckTweets, '"test"')).rejects.toThrow(
      'Array processing error'
    );

    expect(logger.error).toHaveBeenCalledWith(
      'X Tweets - Batch spot check failed with error (took 2.50s):',
      expect.any(Error)
    );
  });
});
