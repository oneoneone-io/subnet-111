import createSyntheticRoute from './create-synthetic.js';
import responseService from '#modules/response/index.js';
import time from '#modules/time/index.js';
import retryable from '#modules/retryable/index.js';

jest.mock('#utils/validator/types/index.js', () => ({
  getRandomType: jest.fn().mockReturnValue({
    id: 'google-maps-reviews',
    name: 'Google Maps Reviews',
    createSyntheticTask: jest.fn(),
  }),
}));

jest.mock('#modules/response/index.js', () => ({
  success: jest.fn(),
  internalServerError: jest.fn(),
}));

jest.mock('#modules/logger/index.js', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

jest.mock('#modules/time/index.js');
jest.mock('#utils/validator/types/index.js');
jest.mock('#modules/retryable/index.js');

describe('routes/validator/create-synthetic.js', () => {
  let timestamp;
  let request;
  let response;
  let metadata;

  beforeEach(() => {
    timestamp = '2021-01-01T00:00:00.000Z';
    time.getCurrentTimestamp.mockReturnValue(timestamp);
    time.getDuration.mockReturnValue(0);

    process.env.APIFY_TOKEN = 'test';

    request = {};
    response = {
      status: jest.fn(),
      json: jest.fn(),
    };
    metadata = {
      dataId: 'selected-dataId',
      id: 'selected-id',
    }

    retryable.mockImplementation(() => metadata);
  });

  describe('.output()', () => {
    test('should output the result properly', () => {
      const result = createSyntheticRoute.output({
        typeId: 'google-maps-reviews',
        typeName: 'Google Maps Reviews',
        metadata,
        totalDuration: 100,
      });
      expect(result).toEqual({
        status: 'success',
        task: {
          typeId: 'google-maps-reviews',
          typeName: 'Google Maps Reviews',
          metadata,
          timestamp,
          totalTime: 100
        }
      });
    });
  });

  describe('.validate()', () => {
    test('should validate the result properly', () => {
      const result = createSyntheticRoute.validate();
      expect(result).toEqual({
        isValid: true,
        message: {}
      });
    });

    test('should fail if validate() fails', () => {
      delete process.env.APIFY_TOKEN;
      const result = createSyntheticRoute.validate();
      expect(result).toEqual({
        isValid: false,
        message: {
          error: 'Configuration error',
          message: 'APIFY_TOKEN not configured'
        }
      });
    });
  });

  describe('.execute()', () => {
    test('should fail if validate() fails', async () => {
      delete process.env.APIFY_TOKEN;
      await createSyntheticRoute.execute(request, response);
      expect(responseService.internalServerError).toHaveBeenCalledWith(response, {
        error: 'Configuration error',
        message: 'APIFY_TOKEN not configured'
      });
    });

    test('should return response properly', async () => {
      await createSyntheticRoute.execute(request, response);
      expect(responseService.success).toHaveBeenCalledWith(response, {
        status: 'success',
        task: {
          typeId: 'google-maps-reviews',
          typeName: 'Google Maps Reviews',
          metadata,
          timestamp,
          totalTime: 0
        }
      });
    });

    test('should fail if createSyntheticTask() fails', async () => {
      retryable.mockImplementation(() => {
        throw new Error('Failed to get eligible place');
      });
      await createSyntheticRoute.execute(request, response);
      expect(responseService.internalServerError).toHaveBeenCalledWith(response, {
        typeId: 'google-maps-reviews',
        typeName: 'Google Maps Reviews',
        error: 'Failed to create synthetic task',
        message: 'Failed to get eligible place',
        totalTime: 0,
        timestamp
      });
    });
  });
});
