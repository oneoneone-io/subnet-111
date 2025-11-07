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
  });

  test('should fetch tweets successfully with guest token', async () => {
    const mockGuestToken = 'test-guest-token';
    const mockTweetData = {
      data: {
        tweetResult: {
          result: {
            rest_id: '123',
            legacy: {
              full_text: 'Test tweet',
              created_at: '2024-01-01',
              entities: {
                hashtags: [{ text: 'test' }]
              }
            },
            core: {
              user_results: {
                result: {
                  rest_id: '456',
                  legacy: {
                    screen_name: 'testuser'
                  }
                }
              }
            }
          }
        }
      }
    };

    // Mock guest token activation
    globalThis.fetch.mockResolvedValueOnce({
      json: async () => ({ guest_token: mockGuestToken })
    });

    // Mock tweet fetch
    globalThis.fetch.mockResolvedValueOnce({
      json: async () => mockTweetData
    });

    retryable.mockImplementation(async (function_) => function_());

    const result = await getTweetsWithGuestToken(['123']);

    expect(result).toEqual([
      {
        id: '123',
        text: 'Test tweet',
        created_at: '2024-01-01',
        user: {
          id: '456',
          username: 'testuser'
        },
        entities: {
          hashtags: [{ text: 'test' }]
        }
      }
    ]);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.twitter.com/1.1/guest/activate.json',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  test('should handle multiple tweet IDs', async () => {
    const mockGuestToken = 'test-guest-token';

    globalThis.fetch.mockResolvedValueOnce({
      json: async () => ({ guest_token: mockGuestToken })
    });

    const mockTweetData1 = {
      data: {
        tweetResult: {
          result: {
            rest_id: '123',
            legacy: {
              full_text: 'Test tweet 1',
              created_at: '2024-01-01',
              entities: { hashtags: [] }
            },
            core: {
              user_results: {
                result: {
                  rest_id: '456',
                  legacy: { screen_name: 'user1' }
                }
              }
            }
          }
        }
      }
    };

    const mockTweetData2 = {
      data: {
        tweetResult: {
          result: {
            rest_id: '789',
            legacy: {
              full_text: 'Test tweet 2',
              created_at: '2024-01-02',
              entities: { hashtags: [] }
            },
            core: {
              user_results: {
                result: {
                  rest_id: '999',
                  legacy: { screen_name: 'user2' }
                }
              }
            }
          }
        }
      }
    };

    globalThis.fetch
      .mockResolvedValueOnce({ json: async () => mockTweetData1 })
      .mockResolvedValueOnce({ json: async () => mockTweetData2 });

    retryable.mockImplementation(async (function_) => function_());

    const result = await getTweetsWithGuestToken(['123', '789']);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('123');
    expect(result[1].id).toBe('789');
  });

  test('should return undefined when tweet result is missing', async () => {
    const mockGuestToken = 'test-guest-token';

    globalThis.fetch.mockResolvedValueOnce({
      json: async () => ({ guest_token: mockGuestToken })
    });

    globalThis.fetch.mockResolvedValueOnce({
      json: async () => ({ data: {} })
    });

    retryable.mockImplementation(async (function_) => {
      try {
        return await function_();
      } catch (error) {
        throw error;
      }
    });

    const result = await getTweetsWithGuestToken(['123']);

    expect(result).toEqual([undefined]);
    expect(logger.warning).toHaveBeenCalled();
  });

  test('should return undefined when legacy data is missing', async () => {
    const mockGuestToken = 'test-guest-token';

    globalThis.fetch.mockResolvedValueOnce({
      json: async () => ({ guest_token: mockGuestToken })
    });

    globalThis.fetch.mockResolvedValueOnce({
      json: async () => ({
        data: {
          tweetResult: {
            result: {
              rest_id: '123'
            }
          }
        }
      })
    });

    retryable.mockImplementation(async (function_) => {
      try {
        return await function_();
      } catch (error) {
        throw error;
      }
    });

    const result = await getTweetsWithGuestToken(['123']);

    expect(result).toEqual([undefined]);
    expect(logger.warning).toHaveBeenCalled();
  });

  test('should return undefined when user data is missing', async () => {
    const mockGuestToken = 'test-guest-token';

    globalThis.fetch.mockResolvedValueOnce({
      json: async () => ({ guest_token: mockGuestToken })
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
                entities: { hashtags: [] }
              }
            }
          }
        }
      })
    });

    retryable.mockImplementation(async (function_) => {
      try {
        return await function_();
      } catch (error) {
        throw error;
      }
    });

    const result = await getTweetsWithGuestToken(['123']);

    expect(result).toEqual([undefined]);
    expect(logger.warning).toHaveBeenCalled();
  });

  test('should handle errors and log warning', async () => {
    const mockGuestToken = 'test-guest-token';

    globalThis.fetch.mockResolvedValueOnce({
      json: async () => ({ guest_token: mockGuestToken })
    });

    retryable.mockImplementation(async () => {
      throw new Error('Network error');
    });

    const result = await getTweetsWithGuestToken(['123']);

    expect(result).toEqual([undefined]);
    expect(logger.warning).toHaveBeenCalledWith(
      'X Tweets - Error fetching tweet 123 with guest token after retries:',
      'Network error'
    );
  });

  test('should use retryable with 3 retries', async () => {
    const mockGuestToken = 'test-guest-token';

    globalThis.fetch.mockResolvedValueOnce({
      json: async () => ({ guest_token: mockGuestToken })
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
                entities: { hashtags: [] }
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

    retryable.mockImplementation(async (function_, retries) => {
      expect(retries).toBe(3);
      return function_();
    });

    await getTweetsWithGuestToken(['123']);

    expect(retryable).toHaveBeenCalledWith(expect.any(Function), 3);
  });

  test('should handle missing entities and default to empty hashtags array', async () => {
    const mockGuestToken = 'test-guest-token';

    globalThis.fetch.mockResolvedValueOnce({
      json: async () => ({ guest_token: mockGuestToken })
    });

    globalThis.fetch.mockResolvedValueOnce({
      json: async () => ({
        data: {
          tweetResult: {
            result: {
              rest_id: '123',
              legacy: {
                full_text: 'Test tweet',
                created_at: '2024-01-01'
                // entities is missing
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

    expect(result[0].entities.hashtags).toEqual([]);
  });
});

