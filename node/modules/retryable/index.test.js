import retryable from './index.js';
import logger from '#modules/logger/index.js';

jest.mock('#modules/logger/index.js', () => ({
  info: jest.fn(),
  error: jest.fn()
}));

describe('modules/retryable', () => {
  describe('.retryable()', () => {
    let function_;

    beforeEach(() => {
      function_ = jest.fn().mockResolvedValue('test');
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should return the result of the function if it succeeds', async () => {
      const result = await retryable(function_);

      expect(logger.error).toHaveBeenCalledTimes(0);
      expect(result).toBe('test');
    });

    test('should return the result after retry', async () => {
      function_.mockRejectedValueOnce(new Error('test'));
      function_.mockResolvedValue('test');

      const result = await retryable(function_, 3, 1);

      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(result).toBe('test');
    });

    test('should return undefined if the function fails after max retries', async () => {
      function_.mockRejectedValue(new Error('test'));

      const result = await retryable(function_, 3, 1);

      expect(logger.error).toHaveBeenCalledTimes(3);
      expect(result).toBe(undefined);
    });
  });
});
