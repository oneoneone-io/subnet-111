import fetchRoute from './fetch.js';
import logger from '#modules/logger/index.js';
import responseService from '#modules/response/index.js';
import time from '#modules/time/index.js';
import Types from '#utils/miner/types/index.js';

// Mock all dependencies
jest.mock('#modules/logger/index.js', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

jest.mock('#modules/response/index.js', () => ({
  success: jest.fn(),
  badRequest: jest.fn(),
  internalServerError: jest.fn(),
}));

jest.mock('#modules/time/index.js', () => ({
  getCurrentTimestamp: jest.fn(),
}));

jest.mock('#utils/miner/types/index.js', () => ({
  getTypeById: jest.fn(),
}));

describe('routes/miner/fetch.js', () => {
  let request;
  let response;
  let timestamp;
  let mockType;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Set up default timestamp
    timestamp = '2023-01-01 12:00:00.000';
    time.getCurrentTimestamp.mockReturnValue(timestamp);

    // Set up default environment
    process.env.APIFY_TOKEN = 'test-token';

    // Set up mock request and response
    request = {
      body: {
        typeId: 'google-maps-reviews',
        metadata: {
          dataId: 'test-data-id',
          language: 'en',
          sort: 'newest'
        },
        timeout: 30
      }
    };

    response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Set up mock type
    mockType = {
      id: 'google-maps-reviews',
      fetch: jest.fn().mockResolvedValue([
        { id: 1, text: 'Great place!', rating: 5 },
        { id: 2, text: 'Not bad', rating: 3 }
      ])
    };

    // Mock successful type lookup by default
    Types.getTypeById.mockReturnValue(mockType);

    // Mock response service methods to return the response object
    responseService.success.mockReturnValue(response);
    responseService.badRequest.mockReturnValue(response);
    responseService.internalServerError.mockReturnValue(response);
  });

  describe('.validate()', () => {
    test('should return valid when all required parameters are provided', () => {
      const parameters = {
        typeId: 'google-maps-reviews',
        metadata: { dataId: 'test' },
        timeout: 30
      };

      const result = fetchRoute.validate(parameters);

      expect(result.isValid).toBe(true);
      expect(result.message).toEqual({});
    });

    test('should return invalid when typeId is missing', () => {
      const parameters = {
        metadata: { dataId: 'test' },
        timeout: 30
      };

      const result = fetchRoute.validate(parameters);

      expect(result.isValid).toBe(false);
      expect(result.message.error).toBe('typeId is required');
      expect(result.message.message).toBe('Please provide a valid typeId');
      expect(logger.error).toHaveBeenCalledWith('[Miner] Error: Missing typeId parameter');
    });

    test('should return invalid when typeId is empty string', () => {
      const parameters = {
        typeId: '',
        metadata: { dataId: 'test' },
        timeout: 30
      };

      const result = fetchRoute.validate(parameters);

      expect(result.isValid).toBe(false);
      expect(result.message.error).toBe('typeId is required');
    });

    test('should return invalid when metadata is missing', () => {
      const parameters = {
        typeId: 'google-maps-reviews',
        timeout: 30
      };

      const result = fetchRoute.validate(parameters);

      expect(result.isValid).toBe(false);
      expect(result.message.error).toBe('metadata is required');
      expect(result.message.message).toBe('Please provide a valid metadata');
      expect(logger.error).toHaveBeenCalledWith('[Miner] Error: Missing metadata parameter');
    });

    test('should return invalid when metadata is empty object', () => {
      const parameters = {
        typeId: 'google-maps-reviews',
        metadata: undefined,
        timeout: 30
      };

      const result = fetchRoute.validate(parameters);

      expect(result.isValid).toBe(false);
      expect(result.message.error).toBe('metadata is required');
    });

    test('should return invalid when timeout is missing', () => {
      const parameters = {
        typeId: 'google-maps-reviews',
        metadata: { dataId: 'test' }
      };

      const result = fetchRoute.validate(parameters);

      expect(result.isValid).toBe(false);
      expect(result.message.error).toBe('timeout is required');
      expect(result.message.message).toBe('Please provide a valid timeout');
      expect(logger.error).toHaveBeenCalledWith('[Miner] Error: Missing timeout parameter');
    });

    test('should return invalid when timeout is 0', () => {
      const parameters = {
        typeId: 'google-maps-reviews',
        metadata: { dataId: 'test' },
        timeout: 0
      };

      const result = fetchRoute.validate(parameters);

      expect(result.isValid).toBe(false);
      expect(result.message.error).toBe('timeout is required');
    });

    test('should return invalid when APIFY_TOKEN is not configured', () => {
      delete process.env.APIFY_TOKEN;

      const parameters = {
        typeId: 'google-maps-reviews',
        metadata: { dataId: 'test' },
        timeout: 30
      };

      const result = fetchRoute.validate(parameters);

      expect(result.isValid).toBe(false);
      expect(result.message.error).toBe('Configuration error');
      expect(result.message.message).toBe('APIFY_TOKEN not configured');
      expect(logger.error).toHaveBeenCalledWith('[Miner] Error: APIFY_TOKEN not configured');
    });

    test('should return invalid when APIFY_TOKEN is empty string', () => {
      process.env.APIFY_TOKEN = '';

      const parameters = {
        typeId: 'google-maps-reviews',
        metadata: { dataId: 'test' },
        timeout: 30
      };

      const result = fetchRoute.validate(parameters);

      expect(result.isValid).toBe(false);
      expect(result.message.error).toBe('Configuration error');
    });
  });

  describe('.output()', () => {
    test('should format successful response correctly', () => {
      const parameters = {
        typeId: 'google-maps-reviews',
        metadata: { dataId: 'test-id' },
        timeout: 30,
        responses: [{ id: 1, text: 'Great!' }]
      };

      const result = fetchRoute.output(parameters);

      expect(result).toEqual({
        status: 'success',
        typeId: 'google-maps-reviews',
        metadata: { dataId: 'test-id' },
        timeout: 30,
        responses: [{ id: 1, text: 'Great!' }],
        timestamp: timestamp
      });
      expect(time.getCurrentTimestamp).toHaveBeenCalled();
    });

    test('should handle empty responses array', () => {
      const parameters = {
        typeId: 'test-type',
        metadata: {},
        timeout: 60,
        responses: []
      };

      const result = fetchRoute.output(parameters);

      expect(result.responses).toEqual([]);
      expect(result.status).toBe('success');
    });

    test('should handle complex metadata object', () => {
      const complexMetadata = {
        dataId: 'test-id',
        language: 'es',
        sort: 'oldest',
        additionalParam: 'value'
      };

      const parameters = {
        typeId: 'google-maps-reviews',
        metadata: complexMetadata,
        timeout: 45,
        responses: [{ test: 'data' }]
      };

      const result = fetchRoute.output(parameters);

      expect(result.metadata).toEqual(complexMetadata);
    });
  });

  describe('.execute()', () => {
    test('should successfully fetch responses when all parameters are valid', async () => {
      await fetchRoute.execute(request, response);

      expect(Types.getTypeById).toHaveBeenCalledWith('google-maps-reviews');
      expect(mockType.fetch).toHaveBeenCalledWith({
        dataId: 'test-data-id',
        language: 'en',
        sort: 'newest'
      });
      expect(logger.info).toHaveBeenCalledWith(
        '[Miner] Fetching responses - Type ID: google-maps-reviews, Metadata: {"dataId":"test-data-id","language":"en","sort":"newest"}, Timeout: 30'
      );
      expect(responseService.success).toHaveBeenCalledWith(response, {
        status: 'success',
        typeId: 'google-maps-reviews',
        metadata: request.body.metadata,
        timeout: 30,
        responses: [
          { id: 1, text: 'Great place!', rating: 5 },
          { id: 2, text: 'Not bad', rating: 3 }
        ],
        timestamp: timestamp
      });
    });

    test('should return bad request when typeId is invalid', async () => {
      Types.getTypeById.mockReturnValue();

      await fetchRoute.execute(request, response);

      expect(responseService.badRequest).toHaveBeenCalledWith(response, {
        typeId: 'google-maps-reviews',
        metadata: request.body.metadata,
        timeout: 30,
        error: 'Invalid typeId',
        message: 'The provided typeId is not valid',
        timestamp: timestamp
      });
      expect(mockType.fetch).not.toHaveBeenCalled();
    });

    test('should return bad request when typeId is undefined', async () => {
      Types.getTypeById.mockReturnValue();

      await fetchRoute.execute(request, response);

      expect(responseService.badRequest).toHaveBeenCalledWith(response, {
        typeId: 'google-maps-reviews',
        metadata: request.body.metadata,
        timeout: 30,
        error: 'Invalid typeId',
        message: 'The provided typeId is not valid',
        timestamp: timestamp
      });
    });

    test('should return bad request when validation fails - missing typeId', async () => {
      request.body.typeId = '';

      await fetchRoute.execute(request, response);

      expect(responseService.badRequest).toHaveBeenCalledWith(response, {
        error: 'typeId is required',
        message: 'Please provide a valid typeId'
      });
      expect(mockType.fetch).not.toHaveBeenCalled();
    });

    test('should return bad request when validation fails - missing metadata', async () => {
      request.body.metadata = undefined;

      await fetchRoute.execute(request, response);

      expect(responseService.badRequest).toHaveBeenCalledWith(response, {
        error: 'metadata is required',
        message: 'Please provide a valid metadata'
      });
      expect(mockType.fetch).not.toHaveBeenCalled();
    });

    test('should return bad request when validation fails - missing timeout', async () => {
      request.body.timeout = 0;

      await fetchRoute.execute(request, response);

      expect(responseService.badRequest).toHaveBeenCalledWith(response, {
        error: 'timeout is required',
        message: 'Please provide a valid timeout'
      });
      expect(mockType.fetch).not.toHaveBeenCalled();
    });

    test('should return bad request when validation fails - missing APIFY_TOKEN', async () => {
      delete process.env.APIFY_TOKEN;

      await fetchRoute.execute(request, response);

      expect(responseService.badRequest).toHaveBeenCalledWith(response, {
        error: 'Configuration error',
        message: 'APIFY_TOKEN not configured'
      });
      expect(mockType.fetch).not.toHaveBeenCalled();
    });

    test('should return internal server error when type.fetch throws an error', async () => {
      const errorMessage = 'Apify actor failed';
      mockType.fetch.mockRejectedValue(new Error(errorMessage));

      await fetchRoute.execute(request, response);

      expect(logger.error).toHaveBeenCalledWith('[Miner] Error fetching responses:', expect.any(Error));
      expect(responseService.internalServerError).toHaveBeenCalledWith(response, {
        typeId: 'google-maps-reviews',
        metadata: request.body.metadata,
        timeout: 30,
        error: 'Failed to fetch responses',
        message: errorMessage,
        timestamp: timestamp
      });
    });

    test('should handle network errors gracefully', async () => {
      const networkError = new Error('Network timeout');
      networkError.code = 'NETWORK_ERROR';
      mockType.fetch.mockRejectedValue(networkError);

      await fetchRoute.execute(request, response);

      expect(responseService.internalServerError).toHaveBeenCalledWith(response, {
        typeId: 'google-maps-reviews',
        metadata: request.body.metadata,
        timeout: 30,
        error: 'Failed to fetch responses',
        message: 'Network timeout',
        timestamp: timestamp
      });
    });

    test('should handle empty responses from type.fetch', async () => {
      mockType.fetch.mockResolvedValue([]);

      await fetchRoute.execute(request, response);

      expect(responseService.success).toHaveBeenCalledWith(response, {
        status: 'success',
        typeId: 'google-maps-reviews',
        metadata: request.body.metadata,
        timeout: 30,
        responses: [],
        timestamp: timestamp
      });
    });

    test('should handle complex metadata objects', async () => {
      const complexMetadata = {
        dataId: 'complex-id',
        language: 'fr',
        sort: 'most_relevant',
        filters: {
          rating: '>= 4',
          keywords: ['restaurant', 'food']
        }
      };

      request.body.metadata = complexMetadata;

      await fetchRoute.execute(request, response);

      expect(mockType.fetch).toHaveBeenCalledWith(complexMetadata);
      expect(responseService.success).toHaveBeenCalledWith(response, expect.objectContaining({
        metadata: complexMetadata
      }));
    });

    test('should handle different timeout values', async () => {
      request.body.timeout = 120;

      await fetchRoute.execute(request, response);

      expect(responseService.success).toHaveBeenCalledWith(response, expect.objectContaining({
        timeout: 120
      }));
    });

    test('should properly stringify metadata for logging', async () => {
      const metadataWithSpecialChars = {
        dataId: 'test"id',
        description: 'A place with "quotes" and special chars: àáâã'
      };

      request.body.metadata = metadataWithSpecialChars;

      await fetchRoute.execute(request, response);

      expect(logger.info).toHaveBeenCalledWith(
        `[Miner] Fetching responses - Type ID: google-maps-reviews, Metadata: ${JSON.stringify(metadataWithSpecialChars)}, Timeout: 30`
      );
    });
  });

  describe('integration tests', () => {
    test('should handle the complete successful flow', async () => {
      const responses = [
        { id: 1, text: 'Excellent service', rating: 5, date: '2023-01-01' },
        { id: 2, text: 'Good food', rating: 4, date: '2023-01-02' }
      ];
      mockType.fetch.mockResolvedValue(responses);

      await fetchRoute.execute(request, response);

      // Verify type lookup
      expect(Types.getTypeById).toHaveBeenCalledWith('google-maps-reviews');

      // Verify validation passed
      expect(logger.error).not.toHaveBeenCalledWith(expect.stringContaining('[Miner] Error:'));

      // Verify fetch was called
      expect(mockType.fetch).toHaveBeenCalledWith(request.body.metadata);

      // Verify success response
      expect(responseService.success).toHaveBeenCalledWith(response, {
        status: 'success',
        typeId: 'google-maps-reviews',
        metadata: request.body.metadata,
        timeout: 30,
        responses: responses,
        timestamp: timestamp
      });

      // Verify no error responses were called
      expect(responseService.badRequest).not.toHaveBeenCalled();
      expect(responseService.internalServerError).not.toHaveBeenCalled();
    });

    test('should handle validation failure before type lookup', async () => {
      request.body.typeId = undefined;

      await fetchRoute.execute(request, response);

      // Type lookup should still happen for invalid typeId case
      expect(Types.getTypeById).toHaveBeenCalledWith(undefined);

      // But validation should fail and prevent fetch
      expect(mockType.fetch).not.toHaveBeenCalled();
      expect(responseService.badRequest).toHaveBeenCalled();
      expect(responseService.success).not.toHaveBeenCalled();
    });
  });

  describe('module exports', () => {
    test('should export all required functions', () => {
      expect(typeof fetchRoute.execute).toBe('function');
      expect(typeof fetchRoute.validate).toBe('function');
      expect(typeof fetchRoute.output).toBe('function');
    });

    test('should have consistent function signatures', () => {
      // Test that functions can be called with expected parameters
      expect(() => fetchRoute.validate({})).not.toThrow();
      expect(() => fetchRoute.output({ typeId: 'test', metadata: {}, timeout: 30, responses: [] })).not.toThrow();
    });
  });
});
