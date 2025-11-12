import getTweetsFromDesearch from './get-tweets-from-desearch.js';
import retryFetch from '#modules/retry-fetch/index.js';
import retryable from '#modules/retryable/index.js';
import logger from '#modules/logger/index.js';
import config from '#config';

jest.mock('#modules/retry-fetch/index.js');
jest.mock('#modules/retryable/index.js');
jest.mock('#modules/logger/index.js', () => ({
  warning: jest.fn(),
}));

describe('#utils/validator/types/x-tweets/score/get-tweets-from-desearch.js', () => {
  const originalEnvironment = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnvironment };
  });

  afterEach(() => {
    process.env = originalEnvironment;
  });

  test('should throw error when DESEARCH_API_TOKEN is not configured', async () => {
    delete process.env.DESEARCH_API_TOKEN;

    await expect(getTweetsFromDesearch(['123'])).rejects.toThrow(
      'DESEARCH_API_TOKEN not configured'
    );
  });

  test('should fetch tweets successfully from Desearch API', async () => {
    process.env.DESEARCH_API_TOKEN = 'test-token';

    const mockTweet1 = { id: '123', text: 'Test tweet 1' };
    const mockTweet2 = { id: '456', text: 'Test tweet 2' };

    retryable.mockImplementation(async (function_) => function_());
    retryFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTweet1,
    });
    retryFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTweet2,
    });

    const result = await getTweetsFromDesearch(['123', '456']);

    expect(result).toEqual([mockTweet1, mockTweet2]);
    expect(retryFetch).toHaveBeenCalledTimes(2);
    expect(retryFetch).toHaveBeenCalledWith(
      `${config.VALIDATOR.X_TWEETS.DESEARCH_API_URL}?id=123`,
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Authorization': 'test-token',
        }),
      })
    );
  });

  test('should handle API error response and log warning', async () => {
    process.env.DESEARCH_API_TOKEN = 'test-token';

    retryable.mockImplementation(async () => {
      throw new Error('Desearch API error: 404 Not Found');
    });

    const result = await getTweetsFromDesearch(['123']);

    expect(result).toEqual([undefined]);
    expect(logger.warning).toHaveBeenCalledWith(
      'X Tweets - Error fetching tweet 123 from Desearch after retries:',
      'Desearch API error: 404 Not Found'
    );
  });

  test('should retry failed requests using retryable', async () => {
    process.env.DESEARCH_API_TOKEN = 'test-token';

    const mockTweet = { id: '123', text: 'Test tweet' };

    retryable.mockImplementation(async (function_, retries) => {
      expect(retries).toBe(3);
      return function_();
    });

    retryFetch.mockResolvedValue({
      ok: true,
      json: async () => mockTweet,
    });

    await getTweetsFromDesearch(['123']);

    expect(retryable).toHaveBeenCalledWith(expect.any(Function), 3);
  });

  test('should handle non-ok response status', async () => {
    process.env.DESEARCH_API_TOKEN = 'test-token';

    retryable.mockImplementation(async (function_) => function_());
    retryFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const result = await getTweetsFromDesearch(['123']);

    expect(result).toEqual([undefined]);
    expect(logger.warning).toHaveBeenCalled();
  });
});

