import createSyntheticRoute from './create-synthetic.js';
import responseService from '#modules/response/index.js';
import config from '#config';
import time from '#modules/time/index.js';
import random from '#modules/random/index.js';
import apify from '#modules/apify/index.js';
import getEligiblePlace from '#utils/validator/google-maps/create-synthetic/get-eligible-place.js';

jest.mock('#modules/response/index.js', () => ({
  success: jest.fn(),
  internalServerError: jest.fn(),
}));

jest.mock('#modules/retryable/index.js', () => {
  return jest.fn().mockImplementation(async (function_) => {
    return await function_();
  });
});

jest.mock('#modules/logger/index.js', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

jest.mock('#utils/validator/google-maps/create-synthetic/get-eligible-place.js');
jest.mock('#modules/time/index.js');
jest.mock('#modules/random/index.js');
jest.mock('#modules/apify/index.js');

describe('routes/validator/create-synthetic.js', () => {
  let selectedPlace;
  let timestamp;
  let request;
  let response;

  beforeEach(() => {
    jest.resetModules();

    timestamp = '2021-01-01T00:00:00.000Z';
    time.getCurrentTimestamp.mockReturnValue(timestamp);
    time.getDuration.mockReturnValue(0);

    process.env.APIFY_TOKEN = 'test';

    request = {};
    response = {
      status: jest.fn(),
      json: jest.fn(),
    };
    selectedPlace = {
      fid: 'selected-fid',
      placeId: 'selected-place-id',
      title: 'Selected Place',
      reviewsCount: 10_000,
      type: 'place',
    }

    getEligiblePlace.mockResolvedValue(selectedPlace);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('.output()', () => {
    test('should output the result properly', () => {
      const result = createSyntheticRoute.output({
        selectedPlace,
        totalDuration: 100,
      });
      expect(result).toEqual({
        status: 'success',
        task: {
          dataId: selectedPlace.fid,
          id: selectedPlace.placeId,
          synapse_params: {
            language: config.VALIDATOR.GOOGLE_REVIEWS_SYNAPSE_PARAMS.language,
            sort: config.VALIDATOR.GOOGLE_REVIEWS_SYNAPSE_PARAMS.sort,
            timeout: config.VALIDATOR.GOOGLE_REVIEWS_SYNAPSE_PARAMS.timeout
          },
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
    beforeEach(() => {
      random.fromArray.mockReturnValue(selectedPlace)
    });

    test('should fail if validate() fails', async () => {
      delete process.env.APIFY_TOKEN;
      await createSyntheticRoute.execute(request, response);
      expect(responseService.internalServerError).toHaveBeenCalledWith(response, {
        error: 'Configuration error',
        message: 'APIFY_TOKEN not configured'
      });
    });

    test('should return response properly', async () => {
      apify.runActorAndGetResults.mockResolvedValue([selectedPlace]);

      await createSyntheticRoute.execute(request, response);
      expect(responseService.success).toHaveBeenCalledWith(response, {
        status: 'success',
        task: {
          dataId: selectedPlace.fid,
          id: selectedPlace.placeId,
          synapse_params: {
            language: config.VALIDATOR.GOOGLE_REVIEWS_SYNAPSE_PARAMS.language,
            sort: config.VALIDATOR.GOOGLE_REVIEWS_SYNAPSE_PARAMS.sort,
            timeout: config.VALIDATOR.GOOGLE_REVIEWS_SYNAPSE_PARAMS.timeout
          },
          timestamp,
          totalTime: 0
        }
      });
    });

    test('should fail if getEligiblePlace() fails', async () => {
      getEligiblePlace.mockRejectedValue(new Error('Failed to get eligible place'));

      await createSyntheticRoute.execute(request, response);
      expect(responseService.internalServerError).toHaveBeenCalled();
    });
  });
});
