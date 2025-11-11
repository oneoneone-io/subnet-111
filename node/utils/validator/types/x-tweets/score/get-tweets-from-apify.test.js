import getTweetsFromApify from './get-tweets-from-apify.js';
import retryable from '#modules/retryable/index.js';
import config from '#config';
import logger from '#modules/logger/index.js';
import apify from '#modules/apify/index.js';

jest.mock('#modules/retryable/index.js');
jest.mock('#modules/logger/index.js', () => ({
  info: jest.fn(),
}));
jest.mock('#modules/apify/index.js');

describe('#utils/validator/types/x-tweets/score/get-tweets-from-apify.js', () => {
  const originalEnvironment = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnvironment };
  });

  afterEach(() => {
    process.env = originalEnvironment;
  });

  test('should throw error when APIFY_TOKEN is not configured', async () => {
    delete process.env.APIFY_TOKEN;

    await expect(getTweetsFromApify(['123'])).rejects.toThrow('APIFY_TOKEN not configured');
  });

  test('should fetch tweets successfully', async () => {
    process.env.APIFY_TOKEN = 'test-token';

    const mockApifyResponse = [
      {
        id: '123',
        text: 'Test tweet',
        createdAt: '2024-01-01',
        author: { id: '456', userName: 'testuser' },
        entities: { hashtags: [{ text: 'test' }] }
      }
    ];

    apify.runActorAndGetResults.mockResolvedValue(mockApifyResponse);
    retryable.mockImplementation(async (function_) => function_());

    const result = await getTweetsFromApify(['123']);

    expect(apify.runActorAndGetResults).toHaveBeenCalledWith(
      config.VALIDATOR.X_TWEETS.APIFY_ACTORS.SPOT_CHECK,
      {
        startUrls: ['http://x.com/x/status/123'],
        maxItems: 1,
        maxRequestRetries: 5,
        batch: true
      }
    );
    expect(retryable).toHaveBeenCalledWith(expect.any(Function), 10);
    expect(logger.info).toHaveBeenCalledWith('X Tweets - Fetched 1 tweets from Apify');
    expect(result).toEqual([
      {
        id: '123',
        text: 'Test tweet',
        created_at: '2024-01-01',
        user: { id: '456', username: 'testuser' },
        entities: { hashtags: [{ text: 'test' }] }
      }
    ]);
  });

  test('should filter out items with noResults', async () => {
    process.env.APIFY_TOKEN = 'test-token';

    const mockApifyResponse = [
      {
        id: '123',
        text: 'Valid tweet',
        createdAt: '2024-01-01',
        author: { id: '456', userName: 'testuser' },
        entities: { hashtags: [] }
      },
      {
        id: '789',
        noResults: true
      }
    ];

    apify.runActorAndGetResults.mockResolvedValue(mockApifyResponse);
    retryable.mockImplementation(async (function_) => function_());

    const result = await getTweetsFromApify(['123', '789']);

    expect(logger.info).toHaveBeenCalledWith('X Tweets - Fetched 2 tweets from Apify');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('123');
  });

  test('should handle missing hashtags', async () => {
    process.env.APIFY_TOKEN = 'test-token';

    const mockApifyResponse = [
      {
        id: '123',
        text: 'Tweet without hashtags',
        createdAt: '2024-01-01',
        author: { id: '456', userName: 'testuser' },
        entities: {}
      }
    ];

    apify.runActorAndGetResults.mockResolvedValue(mockApifyResponse);
    retryable.mockImplementation(async (function_) => function_());

    const result = await getTweetsFromApify(['123']);

    expect(result[0].entities.hashtags).toEqual([]);
  });

  test('should fetch multiple tweets', async () => {
    process.env.APIFY_TOKEN = 'test-token';

    const mockApifyResponse = [
      {
        id: '1',
        text: 'Tweet 1',
        createdAt: '2024-01-01',
        author: { id: '10', userName: 'user1' },
        entities: { hashtags: [] }
      },
      {
        id: '2',
        text: 'Tweet 2',
        createdAt: '2024-01-02',
        author: { id: '20', userName: 'user2' },
        entities: { hashtags: [] }
      }
    ];

    apify.runActorAndGetResults.mockResolvedValue(mockApifyResponse);
    retryable.mockImplementation(async (function_) => function_());

    const result = await getTweetsFromApify(['1', '2']);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('1');
    expect(result[1].id).toBe('2');
    expect(apify.runActorAndGetResults).toHaveBeenCalledWith(
      config.VALIDATOR.X_TWEETS.APIFY_ACTORS.SPOT_CHECK,
      {
        startUrls: ['http://x.com/x/status/1', 'http://x.com/x/status/2'],
        maxItems: 2,
        maxRequestRetries: 5,
        batch: true
      }
    );
  });
});

