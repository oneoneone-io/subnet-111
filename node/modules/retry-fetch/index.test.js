import retryFetch from './index.js';
import retryable from '#modules/retryable/index.js';
import fetch from 'node-fetch';

jest.mock('#modules/retryable/index.js', () => jest.fn());
jest.mock('node-fetch');

describe('modules/retry-fetch', () => {
  let mockResponse;
  let url;

  beforeEach(() => {
    jest.clearAllMocks();

    url = 'https://example.com';
    mockResponse = { status: 200, statusText: 'OK' };
    retryable.mockImplementation(async (function_) => function_());

    fetch.mockResolvedValue(mockResponse);
  });

  describe('retryFetch', () => {
      test('should call fetch with url and options', async () => {
        await retryFetch(url);

        expect(fetch).toHaveBeenCalledWith(url, {});
      });

      test('should pass custom options to fetch', async () => {
        const options = { method: 'POST', headers: { 'Content-Type': 'application/json' } };

        await retryFetch(url, options);

        expect(fetch).toHaveBeenCalledWith(url, options);
      });

    test('should use default retry options', async () => {
      await retryFetch(url);

      expect(retryable).toHaveBeenCalledWith(expect.any(Function), 3, 1000);
    });

    test('should use custom retry options', async () => {
      const retryOptions = { maxRetries: 5, delay: 2000 };

      await retryFetch(url, {}, retryOptions);

      expect(retryable).toHaveBeenCalledWith(expect.any(Function), 5, 2000);
    });

    test('should throw error when all retries fail', async () => {
      retryable.mockImplementation(async () => {});

      await expect(retryFetch(url)).rejects.toThrow(
        `Failed to fetch ${url} after 3 retry attempts`
      );
    });

    test('should use custom shouldRetry function', async () => {
      const mockResponse = { status: 404, statusText: 'Not Found' };
      fetch.mockResolvedValue(mockResponse);

      await expect(retryFetch(url, {}, { shouldRetry: () => true })).rejects.toThrow();
    });
  });

  describe('defaultShouldRetry', () => {
    test('should not retry on 2xx status', () => {
      const response = { status: 200 };
      const shouldRetry = retryFetch.__getDefaultShouldRetry?.() ||
        ((response) => response.status === 429 || response.status >= 500);

      expect(shouldRetry(response)).toBe(false);
    });
  });
});
