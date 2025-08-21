import fetch from './index.js';
import logger from '#modules/logger/index.js';
import apify from '#modules/apify/index.js';
import retryable from '#modules/retryable/index.js';

// Mock all dependencies
jest.mock('#modules/logger/index.js', () => ({
  info: jest.fn(),
  error: jest.fn()
}));

jest.mock('#modules/apify/index.js', () => ({
  runActorAndGetResults: jest.fn()
}));

jest.mock('#modules/retryable/index.js', () => jest.fn());

describe('utils/miner/types/google-maps-reviews/fetch', () => {
  const mockDataId = '0x89c258f97bdb102b:0xea9f8fc0b3ffff55';
  const mockReviews = [
    { id: 1, text: 'Great place!', rating: 5 },
    { id: 2, text: 'Good service', rating: 4 }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('successful fetch scenarios', () => {
    beforeEach(() => {
      // Mock retryable to execute the function directly
      retryable.mockImplementation(async (function_) => await function_());
      apify.runActorAndGetResults.mockResolvedValue(mockReviews);
    });

    test('should fetch reviews with default parameters', async () => {
      const result = await fetch({ dataId: mockDataId });

      expect(logger.info).toHaveBeenCalledWith(
        `[Miner] Fetching reviews - Data ID: ${mockDataId}, Count: 100, Language: en, Sort: newest`
      );
      expect(logger.info).toHaveBeenCalledWith('[Miner] Starting Apify actor for reviews fetch...');

      expect(retryable).toHaveBeenCalledWith(expect.any(Function), 10);

      expect(apify.runActorAndGetResults).toHaveBeenCalledWith(
        'agents/google-maps-reviews',
        {
          placeFIDs: [mockDataId],
          maxItems: 100,
          language: 'en',
          sort: 'newest'
        }
      );

      expect(result).toEqual(mockReviews);
    });

    test('should fetch reviews with custom language parameter', async () => {
      const result = await fetch({
        dataId: mockDataId,
        language: 'es'
      });

      expect(logger.info).toHaveBeenCalledWith(
        `[Miner] Fetching reviews - Data ID: ${mockDataId}, Count: 100, Language: es, Sort: newest`
      );

      expect(apify.runActorAndGetResults).toHaveBeenCalledWith(
        'agents/google-maps-reviews',
        {
          placeFIDs: [mockDataId],
          maxItems: 100,
          language: 'es',
          sort: 'newest'
        }
      );

      expect(result).toEqual(mockReviews);
    });

    test('should fetch reviews with custom sort parameter', async () => {
      const result = await fetch({
        dataId: mockDataId,
        sort: 'oldest'
      });

      expect(logger.info).toHaveBeenCalledWith(
        `[Miner] Fetching reviews - Data ID: ${mockDataId}, Count: 100, Language: en, Sort: oldest`
      );

      expect(apify.runActorAndGetResults).toHaveBeenCalledWith(
        'agents/google-maps-reviews',
        {
          placeFIDs: [mockDataId],
          maxItems: 100,
          language: 'en',
          sort: 'oldest'
        }
      );

      expect(result).toEqual(mockReviews);
    });

    test('should fetch reviews with all custom parameters', async () => {
      const result = await fetch({
        dataId: mockDataId,
        language: 'fr',
        sort: 'most_relevant'
      });

      expect(logger.info).toHaveBeenCalledWith(
        `[Miner] Fetching reviews - Data ID: ${mockDataId}, Count: 100, Language: fr, Sort: most_relevant`
      );

      expect(apify.runActorAndGetResults).toHaveBeenCalledWith(
        'agents/google-maps-reviews',
        {
          placeFIDs: [mockDataId],
          maxItems: 100,
          language: 'fr',
          sort: 'most_relevant'
        }
      );

      expect(result).toEqual(mockReviews);
    });

    test('should use config values correctly', async () => {
      await fetch({ dataId: mockDataId });

      // Verify that the count comes from config
      expect(apify.runActorAndGetResults).toHaveBeenCalledWith(
        expect.stringMatching('agents/google-maps-reviews'),
        expect.objectContaining({
          maxItems: 100
        })
      );
    });

    test('should return empty array when no reviews found', async () => {
      apify.runActorAndGetResults.mockResolvedValue([]);

      const result = await fetch({ dataId: mockDataId });

      expect(result).toEqual([]);
    });

        test('should handle null/undefined return from apify', async () => {
      apify.runActorAndGetResults.mockResolvedValue();

      const result = await fetch({ dataId: mockDataId });

      expect(result).toBeUndefined();
    });
  });

  describe('error handling scenarios', () => {
    test('should handle retryable function errors and rethrow', async () => {
      const mockError = new Error('Apify actor failed');

      // Mock retryable to execute the function and let it throw
      retryable.mockImplementation(async (function_) => await function_());
      apify.runActorAndGetResults.mockRejectedValue(mockError);

      await expect(fetch({ dataId: mockDataId })).rejects.toThrow('Apify actor failed');

      expect(logger.error).toHaveBeenCalledWith('[Miner] Error fetching reviews:', mockError);
      expect(retryable).toHaveBeenCalledWith(expect.any(Function), 10);
    });

    test('should handle retryable wrapper errors', async () => {
      const mockError = new Error('Retryable failed after max attempts');
      retryable.mockRejectedValue(mockError);

      await expect(fetch({ dataId: mockDataId })).rejects.toThrow('Retryable failed after max attempts');

      expect(logger.error).toHaveBeenCalledWith('[Miner] Error fetching reviews:', mockError);
    });

    test('should handle network timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'ETIMEDOUT';

      retryable.mockImplementation(async (function_) => await function_());
      apify.runActorAndGetResults.mockRejectedValue(timeoutError);

      await expect(fetch({ dataId: mockDataId })).rejects.toThrow('Request timeout');

      expect(logger.error).toHaveBeenCalledWith('[Miner] Error fetching reviews:', timeoutError);
    });

    test('should handle apify client errors', async () => {
      const apifyError = new Error('Actor not found');
      apifyError.statusCode = 404;

      retryable.mockImplementation(async (function_) => await function_());
      apify.runActorAndGetResults.mockRejectedValue(apifyError);

      await expect(fetch({ dataId: mockDataId })).rejects.toThrow('Actor not found');

      expect(logger.error).toHaveBeenCalledWith('[Miner] Error fetching reviews:', apifyError);
    });
  });

  describe('integration with retryable', () => {
    test('should pass correct retry count to retryable', async () => {
      retryable.mockImplementation(async (function_) => await function_());
      apify.runActorAndGetResults.mockResolvedValue(mockReviews);

      await fetch({ dataId: mockDataId });

      expect(retryable).toHaveBeenCalledWith(expect.any(Function), 10);
    });

    test('should work when retryable succeeds after retries', async () => {
      // Simulate retryable succeeding after retries
      retryable.mockResolvedValue(mockReviews);

      const result = await fetch({ dataId: mockDataId });

      expect(result).toEqual(mockReviews);
      expect(retryable).toHaveBeenCalledWith(expect.any(Function), 10);
    });
  });

  describe('parameter validation and edge cases', () => {
    beforeEach(() => {
      retryable.mockImplementation(async (function_) => await function_());
      apify.runActorAndGetResults.mockResolvedValue(mockReviews);
    });

    test('should handle empty string dataId', async () => {
      await fetch({ dataId: '' });

      expect(apify.runActorAndGetResults).toHaveBeenCalledWith(
        'agents/google-maps-reviews',
        expect.objectContaining({
          placeFIDs: ['']
        })
      );
    });

    test('should handle special characters in dataId', async () => {
      const specialDataId = '0x89c258f97bdb102b:0xea9f8fc0b3ffff55#test&sort=newest';

      await fetch({ dataId: specialDataId });

      expect(apify.runActorAndGetResults).toHaveBeenCalledWith(
        'agents/google-maps-reviews',
        expect.objectContaining({
          placeFIDs: [specialDataId]
        })
      );
    });

    test('should handle empty string language parameter', async () => {
      await fetch({ dataId: mockDataId, language: '' });

      expect(apify.runActorAndGetResults).toHaveBeenCalledWith(
        'agents/google-maps-reviews',
        expect.objectContaining({
          language: ''
        })
      );
    });

    test('should handle empty string sort parameter', async () => {
      await fetch({ dataId: mockDataId, sort: '' });

      expect(apify.runActorAndGetResults).toHaveBeenCalledWith(
        'agents/google-maps-reviews',
        expect.objectContaining({
          sort: ''
        })
      );
    });
  });

  describe('logging behavior', () => {
    beforeEach(() => {
      retryable.mockImplementation(async (function_) => await function_());
      apify.runActorAndGetResults.mockResolvedValue(mockReviews);
    });

    test('should log correct info messages in success case', async () => {
      await fetch({ dataId: mockDataId, language: 'es', sort: 'oldest' });

      expect(logger.info).toHaveBeenCalledTimes(2);
      expect(logger.info).toHaveBeenNthCalledWith(
        1,
        '[Miner] Fetching reviews - Data ID: 0x89c258f97bdb102b:0xea9f8fc0b3ffff55, Count: 100, Language: es, Sort: oldest'
      );
      expect(logger.info).toHaveBeenNthCalledWith(
        2,
        '[Miner] Starting Apify actor for reviews fetch...'
      );
    });

    test('should log error message when exception occurs', async () => {
      const error = new Error('Test error');
      retryable.mockImplementation(async (function_) => await function_());
      apify.runActorAndGetResults.mockRejectedValue(error);

      await expect(fetch({ dataId: mockDataId })).rejects.toThrow();

      expect(logger.error).toHaveBeenCalledWith('[Miner] Error fetching reviews:', error);
    });

    test('should not call logger.error in success case', async () => {
      await fetch({ dataId: mockDataId });

      expect(logger.error).not.toHaveBeenCalled();
    });
  });
});
