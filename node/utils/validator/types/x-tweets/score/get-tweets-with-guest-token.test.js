import getTweetsWithGuestToken from './get-tweets-with-guest-token.js';
import retryable from '#modules/retryable/index.js';
import logger from '#modules/logger/index.js';

jest.mock('#modules/retryable/index.js');
jest.mock('#modules/logger/index.js', () => ({
  warning: jest.fn(),
}));

globalThis.fetch = jest.fn();

describe('#utils/validator/types/x-tweets/score/get-tweets-with-guest-token.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(globalThis, 'setTimeout').mockImplementation((function_) => function_());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should fetch single tweet successfully', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      json: async () => ({ guest_token: 'token123' })
    });

    globalThis.fetch.mockResolvedValueOnce({
      json: async () => ({
        data: {
          tweetResult: {
            result: {
              rest_id: '123',
              legacy: {
                full_text: 'Test tweet',
                created_at: '2024-01-01',
                entities: { hashtags: [{ text: 'test' }] }
              },
              core: {
                user_results: {
                  result: {
                    rest_id: '456',
                    legacy: { screen_name: 'testuser' }
                  }
                }
              }
            }
          }
        }
      })
    });

    retryable.mockImplementation(async (function_) => function_());

    const result = await getTweetsWithGuestToken(['123']);

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

  test('should fetch multiple tweets', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      json: async () => ({ guest_token: 'token123' })
    });

    globalThis.fetch.mockResolvedValueOnce({
      json: async () => ({
        data: {
          tweetResult: {
            result: {
              rest_id: '1',
              legacy: { full_text: 'Tweet 1', created_at: '2024-01-01', entities: { hashtags: [] } },
              core: { user_results: { result: { rest_id: '10', legacy: { screen_name: 'user1' } } } }
            }
          }
        }
      })
    });

    globalThis.fetch.mockResolvedValueOnce({
      json: async () => ({
        data: {
          tweetResult: {
            result: {
              rest_id: '2',
              legacy: { full_text: 'Tweet 2', created_at: '2024-01-02', entities: { hashtags: [] } },
              core: { user_results: { result: { rest_id: '20', legacy: { screen_name: 'user2' } } } }
            }
          }
        }
      })
    });

    retryable.mockImplementation(async (function_) => function_());

    const result = await getTweetsWithGuestToken(['1', '2']);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('1');
    expect(result[1].id).toBe('2');
  });

  test('should handle missing entities with empty hashtags', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      json: async () => ({ guest_token: 'token123' })
    });

    globalThis.fetch.mockResolvedValueOnce({
      json: async () => ({
        data: {
          tweetResult: {
            result: {
              rest_id: '123',
              legacy: { full_text: 'Test', created_at: '2024-01-01' },
              core: { user_results: { result: { rest_id: '456', legacy: { screen_name: 'user' } } } }
            }
          }
        }
      })
    });

    retryable.mockImplementation(async (function_) => function_());

    const result = await getTweetsWithGuestToken(['123']);

    expect(result[0].entities.hashtags).toEqual([]);
  });

  test('should return undefined when tweet result is missing', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      json: async () => ({ guest_token: 'token123' })
    });

    globalThis.fetch.mockResolvedValueOnce({
      json: async () => ({ data: {} })
    });

    retryable.mockImplementation(async (function_) => function_());

    const result = await getTweetsWithGuestToken(['123']);

    expect(result).toBeUndefined();
    expect(logger.warning).toHaveBeenCalledWith(
      'X Tweets - Error fetching tweet 123 with guest token after retries:',
      'Failed to parse guest token response'
    );
  });

  test('should return undefined when legacy is missing', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      json: async () => ({ guest_token: 'token123' })
    });

    globalThis.fetch.mockResolvedValueOnce({
      json: async () => ({
        data: { tweetResult: { result: { rest_id: '123' } } }
      })
    });

    retryable.mockImplementation(async (function_) => function_());

    const result = await getTweetsWithGuestToken(['123']);

    expect(result).toBeUndefined();
    expect(logger.warning).toHaveBeenCalled();
  });

  test('should return undefined when user is missing', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      json: async () => ({ guest_token: 'token123' })
    });

    globalThis.fetch.mockResolvedValueOnce({
      json: async () => ({
        data: {
          tweetResult: {
            result: {
              rest_id: '123',
              legacy: { full_text: 'Test', created_at: '2024-01-01', entities: { hashtags: [] } }
            }
          }
        }
      })
    });

    retryable.mockImplementation(async (function_) => function_());

    const result = await getTweetsWithGuestToken(['123']);

    expect(result).toBeUndefined();
    expect(logger.warning).toHaveBeenCalled();
  });

  test('should return undefined on retryable error', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      json: async () => ({ guest_token: 'token123' })
    });

    retryable.mockRejectedValueOnce(new Error('Network error'));

    const result = await getTweetsWithGuestToken(['123']);

    expect(result).toBeUndefined();
    expect(logger.warning).toHaveBeenCalledWith(
      'X Tweets - Error fetching tweet 123 with guest token after retries:',
      'Network error'
    );
  });

  test('should call retryable with 3 retries', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      json: async () => ({ guest_token: 'token123' })
    });

    globalThis.fetch.mockResolvedValueOnce({
      json: async () => ({
        data: {
          tweetResult: {
            result: {
              rest_id: '123',
              legacy: { full_text: 'Test', created_at: '2024-01-01', entities: { hashtags: [] } },
              core: { user_results: { result: { rest_id: '456', legacy: { screen_name: 'user' } } } }
            }
          }
        }
      })
    });

    retryable.mockImplementation(async (function_, retries) => {
      expect(retries).toBe(3);
      return function_();
    });

    await getTweetsWithGuestToken(['123']);

    expect(retryable).toHaveBeenCalledWith(expect.any(Function), 3);
  });
});
