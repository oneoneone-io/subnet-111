import fetchTweets from './index.js';
import logger from '#modules/logger/index.js';
import config from '#config';
import retryable from '#modules/retryable/index.js';
import retryFetch from '#modules/retry-fetch/index.js';

// Mock dependencies
jest.mock('#modules/logger/index.js', () => ({
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn()
}));

jest.mock('#config');
jest.mock('#modules/retryable/index.js');
jest.mock('#modules/retry-fetch/index.js');

describe('X-Tweets Fetch', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock config
    config.MINER = {
      X_TWEETS: {
        GRAVITY_API_URL: 'https://api.gravity.com/tweets',
        GRAVITY_KEYWORD_MODE: 'exact'
      }
    };

    // Mock environment variables
    process.env.GRAVITY_API_TOKEN = 'test-token';
    process.env.GRAVITY_TWEET_LIMIT = '10';
  });

  afterEach(() => {
    delete process.env.GRAVITY_API_TOKEN;
    delete process.env.GRAVITY_TWEET_LIMIT;
  });

  describe('parseGravityResponse (tested indirectly)', () => {
    test('should parse valid tweet data correctly', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          status: 'success',
          data: [
            {
              tweet: { id: '123', hashtags: ['#bitcoin'] },
              user: {
                username: 'testuser',
                id: '456',
                display_name: 'Test User',
                followers_count: 1000,
                following_count: 500,
                verified: true,
                user_description: 'Test description'
              },
              text: 'Test tweet content',
              datetime: '2024-01-01T00:00:00Z',
              uri: 'https://x.com/testuser/status/123'
            }
          ]
        })
      };

      retryFetch.mockResolvedValue(mockResponse);
      retryable.mockImplementation((function_) => function_());

      const result = await fetchTweets({ keyword: 'bitcoin' });

      expect(result).toEqual([
        {
          tweetId: '123',
          username: 'testuser',
          text: 'Test tweet content',
          createdAt: '2024-01-01T00:00:00Z',
          tweetUrl: 'https://x.com/testuser/status/123',
          hashtags: ['#bitcoin'],
          userId: '456',
          displayName: 'Test User',
          followersCount: 1000,
          followingCount: 500,
          verified: true,
          userDescription: 'Test description'
        }
      ]);
    });

    test('should filter out tweets with missing required fields', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          status: 'success',
          data: [
            {
              tweet: { id: '123' },
              user: { username: 'testuser' },
              text: 'Test tweet',
              datetime: '2024-01-01T00:00:00Z',
              uri: 'https://x.com/testuser/status/123'
              // Missing required user fields
            },
            {
              tweet: { id: '456' },
              user: {
                username: 'validuser',
                id: '789',
                display_name: 'Valid User',
                followers_count: 1000,
                following_count: 500,
                verified: true
              },
              text: 'Valid tweet',
              datetime: '2024-01-01T00:00:00Z',
              uri: 'https://x.com/validuser/status/456'
            }
          ]
        })
      };

      retryFetch.mockResolvedValue(mockResponse);
      retryable.mockImplementation((function_) => function_());

      const result = await fetchTweets({ keyword: 'bitcoin' });

      // Only the valid tweet should be returned
      expect(result).toHaveLength(1);
      expect(result[0].tweetId).toBe('456');
      expect(result[0].username).toBe('validuser');
    });

    test('should handle tweets with missing hashtags', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          status: 'success',
          data: [
            {
              tweet: { id: '123' }, // No hashtags property
              user: {
                username: 'testuser',
                id: '456',
                display_name: 'Test User',
                followers_count: 1000,
                following_count: 500,
                verified: true
              },
              text: 'Test tweet content',
              datetime: '2024-01-01T00:00:00Z',
              uri: 'https://x.com/testuser/status/123'
            }
          ]
        })
      };

      retryFetch.mockResolvedValue(mockResponse);
      retryable.mockImplementation((function_) => function_());

      const result = await fetchTweets({ keyword: 'bitcoin' });

      expect(result[0].hashtags).toEqual([]);
    });
  });

  describe('fetchTweets', () => {
    test('should fetch tweets successfully', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          status: 'success',
          data: [
            {
              tweet: { id: '123', hashtags: ['#bitcoin'] },
              user: {
                username: 'testuser',
                id: '456',
                display_name: 'Test User',
                followers_count: 1000,
                following_count: 500,
                verified: true,
                user_description: 'Test description'
              },
              text: 'Test tweet content',
              datetime: '2024-01-01T00:00:00Z',
              uri: 'https://x.com/testuser/status/123'
            }
          ]
        })
      };

      retryFetch.mockResolvedValue(mockResponse);
      retryable.mockImplementation((function_) => function_());

      const result = await fetchTweets({ keyword: 'bitcoin' });

      expect(retryFetch).toHaveBeenCalledWith(
        'https://api.gravity.com/tweets',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            source: 'X',
            keywords: ['bitcoin'],
            limit: 10,
            keyword_mode: 'exact'
          })
        }
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        tweetId: '123',
        username: 'testuser',
        text: 'Test tweet content'
      });
    });

    test('should strip quotes from keyword', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          status: 'success',
          data: []
        })
      };

      retryFetch.mockResolvedValue(mockResponse);
      retryable.mockImplementation((function_) => function_());

      await fetchTweets({ keyword: '"bitcoin"' });

      expect(retryFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"keywords":["bitcoin"]')
        })
      );
    });

    test('should throw error when GRAVITY_API_TOKEN is missing', async () => {
      delete process.env.GRAVITY_API_TOKEN;

      await expect(fetchTweets({ keyword: 'bitcoin' }))
        .rejects
        .toThrow('GRAVITY_API_TOKEN not configured');
    });

    test('should throw error when GRAVITY_TWEET_LIMIT is missing', async () => {
      delete process.env.GRAVITY_TWEET_LIMIT;

      await expect(fetchTweets({ keyword: 'bitcoin' }))
        .rejects
        .toThrow('GRAVITY_TWEET_LIMIT not configured');
    });

    test('should handle API error responses', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      };

      retryFetch.mockResolvedValue(mockResponse);
      retryable.mockImplementation((function_) => function_());

      await expect(fetchTweets({ keyword: 'bitcoin' }))
        .rejects
        .toThrow('Gravity API error: 500 Internal Server Error');
    });

    test('should handle non-success API status', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          status: 'error',
          message: 'API error'
        })
      };

      retryFetch.mockResolvedValue(mockResponse);
      retryable.mockImplementation((function_) => function_());

      await expect(fetchTweets({ keyword: 'bitcoin' }))
        .rejects
        .toThrow('Gravity API returned non-success status: error');
    });

    test('should handle empty data response', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          status: 'success',
          data: []
        })
      };

      retryFetch.mockResolvedValue(mockResponse);
      retryable.mockImplementation((function_) => function_());

      const result = await fetchTweets({ keyword: 'bitcoin' });

      expect(result).toEqual([]);
    });

    test('should handle null user description', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          status: 'success',
          data: [
            {
              tweet: { id: '123', hashtags: [] },
              user: {
                username: 'testuser',
                id: '456',
                display_name: 'Test User',
                followers_count: 1000,
                following_count: 500,
                verified: false,
                user_description: undefined
              },
              text: 'Test tweet content',
              datetime: '2024-01-01T00:00:00Z',
              uri: 'https://x.com/testuser/status/123'
            }
          ]
        })
      };

      retryFetch.mockResolvedValue(mockResponse);
      retryable.mockImplementation((function_) => function_());

      const result = await fetchTweets({ keyword: 'bitcoin' });

      expect(result[0]).not.toHaveProperty('userDescription');
    });

    test('should use retryable wrapper with 10 retries', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          status: 'success',
          data: []
        })
      };

      retryFetch.mockResolvedValue(mockResponse);
      retryable.mockImplementation((function_) => function_());

      await fetchTweets({ keyword: 'bitcoin' });

      expect(retryable).toHaveBeenCalledWith(expect.any(Function), 10);
    });

    test('should log appropriate messages', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          status: 'success',
          data: []
        })
      };

      retryFetch.mockResolvedValue(mockResponse);
      retryable.mockImplementation((function_) => function_());

      await fetchTweets({ keyword: 'bitcoin' });

      expect(logger.info).toHaveBeenCalledWith(
        '[Miner] Fetching tweets - Keyword: bitcoin, Limit: 10'
      );
      expect(logger.info).toHaveBeenCalledWith(
        '[Miner] Starting Gravity API for tweets fetch...'
      );
    });

    test('should handle network errors', async () => {
      retryFetch.mockRejectedValue(new Error('Network error'));
      retryable.mockImplementation((function_) => function_());

      await expect(fetchTweets({ keyword: 'bitcoin' }))
        .rejects
        .toThrow('Network error');
    });

    test('should handle JSON parsing errors', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      };

      retryFetch.mockResolvedValue(mockResponse);
      retryable.mockImplementation((function_) => function_());

      await expect(fetchTweets({ keyword: 'bitcoin' }))
        .rejects
        .toThrow('Invalid JSON');
    });

    test('should handle missing data property in response', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          status: 'success'
          // No data property
        })
      };

      retryFetch.mockResolvedValue(mockResponse);
      retryable.mockImplementation((function_) => function_());

      const result = await fetchTweets({ keyword: 'bitcoin' });

      expect(result).toEqual([]);
    });

    test('should log error messages on failure', async () => {
      retryFetch.mockRejectedValue(new Error('Test error'));
      retryable.mockImplementation((function_) => function_());

      await expect(fetchTweets({ keyword: 'bitcoin' }))
        .rejects
        .toThrow('Test error');

      expect(logger.error).toHaveBeenCalledWith(
        '[Miner] Error fetching tweets:',
        expect.any(Error)
      );
    });

    test('should handle different tweet limit values', async () => {
      process.env.GRAVITY_TWEET_LIMIT = '50';

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          status: 'success',
          data: []
        })
      };

      retryFetch.mockResolvedValue(mockResponse);
      retryable.mockImplementation((function_) => function_());

      await fetchTweets({ keyword: 'bitcoin' });

      expect(retryFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"limit":50')
        })
      );
    });

    test('should handle tweets with zero followers', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          status: 'success',
          data: [
            {
              tweet: { id: '123', hashtags: [] },
              user: {
                username: 'newuser',
                id: '456',
                display_name: 'New User',
                followers_count: 0,
                following_count: 0,
                verified: false
              },
              text: 'First tweet',
              datetime: '2024-01-01T00:00:00Z',
              uri: 'https://x.com/newuser/status/123'
            }
          ]
        })
      };

      retryFetch.mockResolvedValue(mockResponse);
      retryable.mockImplementation((function_) => function_());

      const result = await fetchTweets({ keyword: 'bitcoin' });

      expect(result[0].followersCount).toBe(0);
      expect(result[0].followingCount).toBe(0);
      expect(result[0].verified).toBe(false);
    });
  });
});
