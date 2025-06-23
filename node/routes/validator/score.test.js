import scoreRoute from './score.js';
import responseService from '#modules/response/index.js';
import time from '#modules/time/index.js';
import { prepareResponses } from '#utils/validator/google-maps/score/prepare-responses.js';
import calculateFinalScores from '#utils/validator/google-maps/score/calculate-final-scores.js';
import performBatchSpotCheck from '#utils/validator/google-maps/score/perform-batch-spot-check.js';
import validateMinerAgainstBatch from '#utils/validator/google-maps/score/validate-miner-against-batch.js';

jest.mock('#modules/time/index.js');
jest.mock('#utils/validator/google-maps/score/prepare-responses.js', () => ({
  prepareResponses: jest.fn(),
  getReviewsForSpotCheck: jest.fn(),
}));
jest.mock('#utils/validator/google-maps/score/calculate-final-scores.js');
jest.mock('#utils/validator/google-maps/score/perform-batch-spot-check.js');
jest.mock('#utils/validator/google-maps/score/validate-miner-against-batch.js');
jest.mock('#utils/validator/google-maps/score/prepare-and-send-for-digestion.js', () => jest.fn().mockResolvedValue(true))

jest.mock('#modules/response/index.js', () => ({
  success: jest.fn(),
  internalServerError: jest.fn(),
  badRequest: jest.fn(),
}));
jest.mock('#modules/logger/index.js', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

describe('routes/validator/score.js', () => {
  let timestamp;

  beforeEach(() => {
    jest.resetModules();

    timestamp = '2021-01-01T00:00:00.000Z';
    time.getCurrentTimestamp.mockReturnValue(timestamp);
  });

  describe('.output()', () => {
    test('should output the result properly', () => {
      const result = scoreRoute.output({
        fid: "fid",
        scores: [],
        minScore: 1,
        maxScore: 1,
        meanScore: 1,
        finalScores: []
      });
      expect(result).toEqual({
        status: 'success',
        fid: "fid",
        scores: [],
        statistics: {
          count: 0,
          mean: 1,
          min: 1,
          max: 1
        },
        timestamp,
        detailedResults: []
      });
    });

    test('should output the result properly with fallback values', () => {
      const result = scoreRoute.output({
        fid: "fid",
        finalScores: []
      });
      expect(result).toEqual({
        status: 'success',
        fid: "fid",
        scores: undefined,
        statistics: {
          count: 0,
          mean: 0,
          min: 0,
          max: 0
        },
        timestamp,
        detailedResults: []
      });
    });
  });

  describe('.validate()', () => {
    test('should fail if fid is not provided', () => {
      const { isValid, message } = scoreRoute.validate({});

      expect(isValid).toBe(false);
      expect(message.error).toBe('Invalid request');
      expect(message.message).toBe('fid and responses array are required');
    });

    test('should fail if responses is not provided', () => {
      const { isValid, message } = scoreRoute.validate({ fid: "fid" });

      expect(isValid).toBe(false);
      expect(message.error).toBe('Invalid request');
      expect(message.message).toBe('fid and responses array are required');
    });

    test('should fail if responses is not an array', () => {
      const { isValid, message } = scoreRoute.validate({ fid: "fid", responses: "not an array" });

      expect(isValid).toBe(false);
      expect(message.error).toBe('Invalid request');
      expect(message.message).toBe('fid and responses array are required');
    });

    test('should pass if responses is an array and if fid exists', () => {
      const { isValid, message } = scoreRoute.validate({ fid: "fid", responses: [] });

      expect(isValid).toBe(true);
      expect(message).toEqual({})
    });
  });

  describe('.execute()', () => {
    let response;
    let request;

    beforeEach(() => {
      response = {
        status: jest.fn(),
        json: jest.fn(),
      };
      request = {
        body: {
          fid: "fid",
          responses: [],
          responseTimes: [],
          synapseTimeout: 120,
          minerUIDs: []
        }
      };

      prepareResponses.mockReturnValue({
        validationData: [],
        allSpotCheckReviews: []
      });

      calculateFinalScores.mockReturnValue({
        scores: [],
        meanScore: 0,
        minScore: 0,
        maxScore: 0,
        finalScores: []
      });

      performBatchSpotCheck.mockResolvedValue(new Map());
      validateMinerAgainstBatch.mockReturnValue(true)
    });

    test('should return a badRequest if the request is invalid', async () => {
      request.body = {}
      await scoreRoute.execute(request, response);
      expect(responseService.badRequest).toHaveBeenCalledWith(response, {
        error: 'Invalid request',
        message: 'fid and responses array are required'
      });
    });

    test('should return a internalServerError if the the execution fails', async () => {
      prepareResponses.mockImplementation(() => {
        throw new Error('Invalid request');
      });
      await scoreRoute.execute(request, response);
      expect(responseService.internalServerError).toHaveBeenCalledWith(response, {
        error: 'Failed to score responses',
        message: 'Invalid request',
        timestamp
      });
    });

    test('should return a success if the execution succeeds with empty values', async () => {
      await scoreRoute.execute(request, response);
      expect(responseService.success).toHaveBeenCalledWith(response, {
        status: 'success',
        fid: "fid",
        scores: [],
        statistics: {
          count: 0,
          mean: 0,
          min: 0,
          max: 0
        },
        timestamp,
        detailedResults: []
      });
    });

    test('should return a success if the execution succeeds', async () => {
      request.body.responseTimes = [100, 200, 300];
      prepareResponses.mockReturnValue({
        validationData: [{data: [], minerUID: 1}],
        allSpotCheckReviews: [1]
      });
      calculateFinalScores.mockReturnValue({
        scores: [],
        meanScore: 0,
        minScore: 0,
        maxScore: 0,
        finalScores: []
      });
      performBatchSpotCheck.mockResolvedValue(new Map());
      await scoreRoute.execute(request, response);
      expect(responseService.success).toHaveBeenCalledWith(response, {
        status: 'success',
        fid: "fid",
        scores: [],
        statistics: {
          count: 0,
          mean: 0,
          min: 0,
          max: 0
        },
        timestamp,
        detailedResults: []
      });
    });

    test('should return empty results if the spot check fails', async () => {
      prepareResponses.mockReturnValue({
        validationData: [{data: [1], minerUID: 1}, {data: [], minerUID: 2}],
        allSpotCheckReviews: [1]
      });
      calculateFinalScores.mockReturnValue({
        scores: [],
        meanScore: 0,
        minScore: 0,
        maxScore: 0,
        finalScores: []
      });
      performBatchSpotCheck.mockRejectedValue(new Error('Spot check failed'));
      await scoreRoute.execute(request, response);
      expect(responseService.success).toHaveBeenCalledWith(response, {
        status: 'success',
        fid: "fid",
        scores: [],
        statistics: {
          count: 0,
          mean: 0,
          min: 0,
          max: 0
        },
        timestamp,
        detailedResults: []
      });
    });

    test('should return a success if the execution succeeds with spot check', async () => {
      prepareResponses.mockReturnValue({
        validationData: [{passedValidation: true, data: [1,2,3], minerUID: 1}],
        allSpotCheckReviews: [1]
      });
      calculateFinalScores.mockReturnValue({
        scores: [],
        meanScore: 0,
        minScore: 0,
        maxScore: 0,
        finalScores: []
      });
      performBatchSpotCheck.mockResolvedValue(new Map());
      await scoreRoute.execute(request, response);
      expect(responseService.success).toHaveBeenCalledWith(response, {
        status: 'success',
        fid: "fid",
        scores: [],
        statistics: {
          count: 0,
          mean: 0,
          min: 0,
          max: 0
        },
        timestamp,
        detailedResults: []
      });
    });

    test('should return a success if the spot check passes', async () => {
      prepareResponses.mockReturnValue({
        validationData: [{passedValidation: true, data: [1,2,3], minerUID: 1}],
        allSpotCheckReviews: [1]
      });
      calculateFinalScores.mockReturnValue({
        scores: [],
        meanScore: 0,
        minScore: 0,
        maxScore: 0,
        finalScores: []
      });
      performBatchSpotCheck.mockResolvedValue(new Map());
      validateMinerAgainstBatch.mockReturnValue(false);
      await scoreRoute.execute(request, response);
      expect(responseService.success).toHaveBeenCalledWith(response, {
        status: 'success',
        fid: "fid",
        scores: [],
        statistics: {
          count: 0,
          mean: 0,
          min: 0,
          max: 0
        },
        timestamp,
        detailedResults: []
      });
    });
  });
});
