/* eslint-disable unicorn/no-useless-undefined */
import scoreRoute from './score.js';
import responseService from '#modules/response/index.js';
import time from '#modules/time/index.js';
import logger from '#modules/logger/index.js';
import calculateFinalScores from '#utils/validator/calculate-final-scores.js';
import Types from '#utils/validator/types/index.js';
import uploadToS3 from '#utils/validator/upload-to-s3.js';
import sendMetadata from '#utils/validator/send-metadata.js';
import streamJsonParser from '#modules/stream-json-parser/index.js';

jest.mock('#modules/response/index.js', () => ({
  success: jest.fn(),
  badRequest: jest.fn(),
  internalServerError: jest.fn(),
}));

jest.mock('#modules/logger/index.js', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

jest.mock('#modules/time/index.js', () => ({
  getCurrentTimestamp: jest.fn(),
}));

jest.mock('#utils/validator/calculate-final-scores.js', () => jest.fn());

jest.mock('#utils/validator/types/index.js', () => ({
  getTypeById: jest.fn(),
}));

jest.mock('#utils/validator/upload-to-s3.js', () => jest.fn());

jest.mock('#utils/validator/send-metadata.js', () => jest.fn());

jest.mock('#modules/stream-json-parser/index.js', () => ({
  parseStreamJSON: jest.fn(),
}));

describe('routes/validator/score.js', () => {
  let timestamp;
  let metadata;
  let selectedType;

  beforeEach(() => {
    timestamp = '2021-01-01T00:00:00.000Z';
    time.getCurrentTimestamp.mockReturnValue(timestamp);
    metadata = {
      typeId: 'google-maps-reviews',
      dataId: '123',
    };
    selectedType = {
      id: 'google-maps-reviews',
      name: 'Google Maps Reviews',
      score: jest.fn(),
      prepareAndSendForDigestion: jest.fn().mockResolvedValue(undefined),
      scoreConstants: {
        SPEED: 0.3,
        VOLUME: 0.5,
        RECENCY: 0.2,
      },
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('.output()', () => {
    test('should output the result properly with empty finalScores', () => {
      const result = scoreRoute.output({
        metadata,
        typeId: 'google-maps-reviews',
        typeName: 'Google Maps Reviews',
        statistics: {
          count: 0,
          mean: 1,
          min: 1,
          max: 1
        },
        finalScores: []
      });
      expect(result).toEqual({
        status: 'success',
        typeId: 'google-maps-reviews',
        typeName: 'Google Maps Reviews',
        metadata,
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

    test('should output the result properly with finalScores data', () => {
      const finalScores = [
        { score: 0.8, minerUID: 1, details: 'Good response' },
        { score: 0.6, minerUID: 2, details: 'Average response' }
      ];

      const result = scoreRoute.output({
        metadata,
        typeId: 'google-maps-reviews',
        typeName: 'Google Maps Reviews',
        statistics: {
          count: 2,
          mean: 0.7,
          min: 0.6,
          max: 0.8
        },
        finalScores
      });

      expect(result).toEqual({
        status: 'success',
        typeId: 'google-maps-reviews',
        typeName: 'Google Maps Reviews',
        metadata,
        scores: [0.8, 0.6],
        statistics: {
          count: 2,
          mean: 0.7,
          min: 0.6,
          max: 0.8
        },
        timestamp,
        detailedResults: finalScores
      });
    });

    test('should call time.getCurrentTimestamp for timestamp', () => {
      scoreRoute.output({
        metadata,
        typeId: 'test-type',
        typeName: 'Test Type',
        statistics: { count: 0, mean: 0, min: 0, max: 0 },
        finalScores: []
      });

      expect(time.getCurrentTimestamp).toHaveBeenCalled();
    });
  });

  describe('.validate()', () => {
    test('should fail if typeId is not provided', () => {
      const { isValid, message } = scoreRoute.validate({});

      expect(isValid).toBe(false);
      expect(message.error).toBe('Invalid request');
      expect(message.message).toBe('typeId, metadata, responses array and selectedType are required');
    });

    test('should fail if metadata is not provided', () => {
      const { isValid, message } = scoreRoute.validate({
        typeId: "typeId",
        responses: [],
        selectedType
      });

      expect(isValid).toBe(false);
      expect(message.error).toBe('Invalid request');
      expect(message.message).toBe('typeId, metadata, responses array and selectedType are required');
    });

    test('should fail if responses is not provided', () => {
      const { isValid, message } = scoreRoute.validate({
        typeId: "typeId",
        metadata,
        selectedType
      });

      expect(isValid).toBe(false);
      expect(message.error).toBe('Invalid request');
      expect(message.message).toBe('typeId, metadata, responses array and selectedType are required');
    });

    test('should fail if responses is not an array', () => {
      const { isValid, message } = scoreRoute.validate({
        typeId: "typeId",
        metadata,
        responses: "not an array",
        selectedType
      });

      expect(isValid).toBe(false);
      expect(message.error).toBe('Invalid request');
      expect(message.message).toBe('typeId, metadata, responses array and selectedType are required');
    });

    test('should fail if selectedType does not exist', () => {
      const { isValid, message } = scoreRoute.validate({
        typeId: "typeId",
        metadata,
        responses: [],
        selectedType: undefined
      });

      expect(isValid).toBe(false);
      expect(message.error).toBe('Invalid request');
      expect(message.message).toBe('typeId, metadata, responses array and selectedType are required');
    });

    test('should fail if selectedType is null', () => {
      const { isValid, message } = scoreRoute.validate({
        typeId: "typeId",
        metadata,
        responses: [],
        selectedType: undefined
      });

      expect(isValid).toBe(false);
      expect(message.error).toBe('Invalid request');
      expect(message.message).toBe('typeId, metadata, responses array and selectedType are required');
    });

    test('should pass validation with all required fields', () => {
      const { isValid, message } = scoreRoute.validate({
        typeId: "google-maps-reviews",
        metadata,
        responses: [],
        selectedType
      });

      expect(isValid).toBe(true);
      expect(message).toEqual({});
    });

    test('should pass validation with valid responses array', () => {
      const responses = [
        [{ reviewId: '1', text: 'Great place!' }],
        [{ reviewId: '2', text: 'Nice service!' }]
      ];

      const { isValid, message } = scoreRoute.validate({
        typeId: "google-maps-reviews",
        metadata,
        responses,
        selectedType
      });

      expect(isValid).toBe(true);
      expect(message).toEqual({});
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
          typeId: 'google-maps-reviews',
          metadata,
          responses: [],
          responseTimes: [],
          synapseTimeout: 120,
          minerUIDs: []
        }
      };

      streamJsonParser.parseStreamJSON.mockResolvedValue(request.body);
      Types.getTypeById.mockReturnValue(selectedType);
      selectedType.score.mockResolvedValue([]);
      calculateFinalScores.mockReturnValue({
        statistics: {
          count: 0,
          mean: 0,
          min: 0,
          max: 0
        },
        finalScores: []
      });
    });

    test('should return internalServerError if streamJsonParser throws error', async () => {
      streamJsonParser.parseStreamJSON.mockRejectedValue(new Error('Parse failed'));

      await scoreRoute.execute(request, response);

      expect(responseService.internalServerError).toHaveBeenCalledWith(response, {
        error: 'Failed to score responses',
        message: 'Parse failed',
        timestamp
      });
      expect(logger.error).toHaveBeenCalledWith('Error scoring responses:', expect.any(Error));
    });

    test('should return a badRequest if the request is invalid (missing typeId)', async () => {
      const invalidBody = { responses: [], metadata };
      streamJsonParser.parseStreamJSON.mockResolvedValue(invalidBody);

      await scoreRoute.execute(request, response);

      expect(responseService.badRequest).toHaveBeenCalledWith(response, {
        error: 'Invalid request',
        message: 'typeId, metadata, responses array and selectedType are required'
      });
    });

    test('should return a badRequest if typeId is not found', async () => {
      Types.getTypeById.mockReturnValue();

      await scoreRoute.execute(request, response);

      expect(responseService.badRequest).toHaveBeenCalledWith(response, {
        error: 'Invalid request',
        message: 'typeId, metadata, responses array and selectedType are required'
      });
    });

    test('should return internalServerError if Types.getTypeById throws error', async () => {
      Types.getTypeById.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await scoreRoute.execute(request, response);

      expect(responseService.internalServerError).toHaveBeenCalledWith(response, {
        error: 'Failed to score responses',
        message: 'Database connection failed',
        timestamp
      });
      expect(logger.error).toHaveBeenCalledWith('Error scoring responses:', expect.any(Error));
    });

    test('should return internalServerError if selectedType.score throws error', async () => {
      selectedType.score.mockRejectedValue(new Error('Scoring failed'));

      await scoreRoute.execute(request, response);

      expect(responseService.internalServerError).toHaveBeenCalledWith(response, {
        error: 'Failed to score responses',
        message: 'Scoring failed',
        timestamp
      });
      expect(logger.error).toHaveBeenCalledWith('Error scoring responses:', expect.any(Error));
    });

    test('should return internalServerError if calculateFinalScores throws error', async () => {
      calculateFinalScores.mockImplementation(() => {
        throw new Error('Calculation failed');
      });

      await scoreRoute.execute(request, response);

      expect(responseService.internalServerError).toHaveBeenCalledWith(response, {
        error: 'Failed to score responses',
        message: 'Calculation failed',
        timestamp
      });
    });

    test('should log appropriate information during execution', async () => {
      await scoreRoute.execute(request, response);

      expect(logger.info).toHaveBeenCalledWith('Google Maps Reviews - Scoring 0 responses.');
      expect(logger.info).toHaveBeenCalledWith(`Google Maps Reviews - Metadata: ${JSON.stringify(metadata)}`);
      expect(logger.info).toHaveBeenCalledWith('Google Maps Reviews - Response times provided: No');
      expect(logger.info).toHaveBeenCalledWith('Google Maps Reviews - Synapse timeout: 120 seconds');
      expect(logger.info).toHaveBeenCalledWith('Google Maps Reviews - Miner UIDs: []');
    });

    test('should log response times information when provided', async () => {
      request.body.responseTimes = [100, 200, 300];
      streamJsonParser.parseStreamJSON.mockResolvedValue(request.body);

      await scoreRoute.execute(request, response);

      expect(logger.info).toHaveBeenCalledWith('Google Maps Reviews - Response times provided: Yes');
    });

    test('should log miner UIDs when provided', async () => {
      request.body.minerUIDs = [1, 2, 3];
      streamJsonParser.parseStreamJSON.mockResolvedValue(request.body);

      await scoreRoute.execute(request, response);

      expect(logger.info).toHaveBeenCalledWith('Google Maps Reviews - Miner UIDs: [1, 2, 3]');
    });

    test('should call selectedType.score with correct parameters', async () => {
      const responses = [[{ id: 1 }], [{ id: 2 }]];
      const responseTimes = [100, 200];
      const minerUIDs = [1, 2];

      request.body = {
        typeId: 'google-maps-reviews',
        metadata,
        responses,
        responseTimes,
        synapseTimeout: 60,
        minerUIDs
      };
      streamJsonParser.parseStreamJSON.mockResolvedValue(request.body);

      await scoreRoute.execute(request, response);

      expect(selectedType.score).toHaveBeenCalledWith(responses, metadata, responseTimes, 60, minerUIDs, 'google-maps-reviews');
    });

    test('should call calculateFinalScores with correct parameters', async () => {
      const validationResults = [{ score: 0.8 }, { score: 0.6 }];
      selectedType.score.mockResolvedValue(validationResults);

      await scoreRoute.execute(request, response);

      expect(calculateFinalScores).toHaveBeenCalledWith(selectedType, validationResults, 120);
    });

    test('should call prepareAndSendForDigestion with correct parameters', async () => {
      const responses = [[{ id: 1 }]];
      const minerUIDs = [1];

      request.body.responses = responses;
      request.body.minerUIDs = minerUIDs;
      streamJsonParser.parseStreamJSON.mockResolvedValue(request.body);

      await scoreRoute.execute(request, response);

      expect(selectedType.prepareAndSendForDigestion).toHaveBeenCalledWith(responses, minerUIDs, metadata);
    });

    test('should use default values for optional parameters', async () => {
      request.body = {
        typeId: 'google-maps-reviews',
        metadata,
        responses: []
      };
      streamJsonParser.parseStreamJSON.mockResolvedValue(request.body);

      await scoreRoute.execute(request, response);

      expect(selectedType.score).toHaveBeenCalledWith([], metadata, [], 120, [], 'google-maps-reviews');
    });

    test('should return success with empty results', async () => {
      await scoreRoute.execute(request, response);

      expect(responseService.success).toHaveBeenCalledWith(response, {
        status: 'success',
        typeId: 'google-maps-reviews',
        typeName: 'Google Maps Reviews',
        metadata,
        statistics: {
          count: 0,
          mean: 0,
          min: 0,
          max: 0
        },
        scores: [],
        timestamp,
        detailedResults: []
      });
    });

    test('should return success with scoring results', async () => {
      const validationResults = [
        { minerUID: 1, score: 0.8 },
        { minerUID: 2, score: 0.6 }
      ];
      const finalScores = [
        { score: 0.8, minerUID: 1 },
        { score: 0.6, minerUID: 2 }
      ];

      selectedType.score.mockResolvedValue(validationResults);
      calculateFinalScores.mockReturnValue({
        statistics: {
          count: 2,
          mean: 0.7,
          min: 0.6,
          max: 0.8
        },
        finalScores
      });

      await scoreRoute.execute(request, response);

      expect(responseService.success).toHaveBeenCalledWith(response, {
        status: 'success',
        typeId: 'google-maps-reviews',
        typeName: 'Google Maps Reviews',
        metadata,
        statistics: {
          count: 2,
          mean: 0.7,
          min: 0.6,
          max: 0.8
        },
        scores: [0.8, 0.6],
        timestamp,
        detailedResults: finalScores
      });
    });

    test('should log error if prepareAndSendForDigestion rejects but still return success', async () => {
      selectedType.prepareAndSendForDigestion.mockRejectedValue(new Error('Digestion failed'));

      await scoreRoute.execute(request, response);

      // Should still return success since this is a fire-and-forget operation
      expect(responseService.success).toHaveBeenCalledWith(response, expect.any(Object));
      
      // Wait for the promise rejection to be handled
      await new Promise(resolve => setImmediate(resolve));
      
      // Should log the error from the catch handler
      expect(logger.error).toHaveBeenCalledWith('Error in prepareAndSendForDigestion: Digestion failed');
    });

    test('should process complex request with all parameters', async () => {
      const complexRequest = {
        body: {
          typeId: 'google-maps-reviews',
          metadata: {
            fid: '0x89c258f97bdb102b:0xea9f8fc0b3ffff55',
            location: 'San Francisco'
          },
          responses: [
            [{ reviewId: '1', text: 'Great place!' }],
            [{ reviewId: '2', text: 'Nice service!' }]
          ],
          responseTimes: [1.5, 2.8],
          synapseTimeout: 90,
          minerUIDs: [5, 10]
        }
      };

      streamJsonParser.parseStreamJSON.mockResolvedValue(complexRequest.body);

      const validationResults = [
        { minerUID: 5, score: 0.9 },
        { minerUID: 10, score: 0.7 }
      ];

      selectedType.score.mockResolvedValue(validationResults);
      calculateFinalScores.mockReturnValue({
        statistics: { count: 2, mean: 0.8, min: 0.7, max: 0.9 },
        finalScores: validationResults
      });

      await scoreRoute.execute(complexRequest, response);

      expect(selectedType.score).toHaveBeenCalledWith(
        complexRequest.body.responses,
        complexRequest.body.metadata,
        complexRequest.body.responseTimes,
        complexRequest.body.synapseTimeout,
        complexRequest.body.minerUIDs,
        'google-maps-reviews'
      );

      expect(responseService.success).toHaveBeenCalledWith(response, {
        status: 'success',
        typeId: 'google-maps-reviews',
        typeName: 'Google Maps Reviews',
        metadata: complexRequest.body.metadata,
        statistics: { count: 2, mean: 0.8, min: 0.7, max: 0.9 },
        scores: [0.9, 0.7],
        timestamp,
        detailedResults: validationResults
      });
    });

    test('should use S3 upload path when S3_ENABLED is true', async () => {
      const originalS3Enabled = process.env.S3_ENABLED;
      process.env.S3_ENABLED = 'true';

      const validationResults = [{ minerUID: 1, score: 0.8 }];
      selectedType.score.mockResolvedValue(validationResults);

      uploadToS3.mockResolvedValue({
        totalItemCount: 10,
        s3Bucket: 'test-bucket',
        s3Path: 'test/path.json'
      });

      await scoreRoute.execute(request, response);

      expect(uploadToS3).toHaveBeenCalledWith(validationResults, metadata, selectedType);
      expect(sendMetadata).toHaveBeenCalledWith(
        'google-maps-reviews',
        metadata,
        10,
        'test-bucket',
        'test/path.json'
      );
      expect(selectedType.prepareAndSendForDigestion).not.toHaveBeenCalled();

      process.env.S3_ENABLED = originalS3Enabled;
    });

    test('should use legacy digestion path when S3_ENABLED is not true', async () => {
      const originalS3Enabled = process.env.S3_ENABLED;
      process.env.S3_ENABLED = 'false';

      await scoreRoute.execute(request, response);

      expect(uploadToS3).not.toHaveBeenCalled();
      expect(sendMetadata).not.toHaveBeenCalled();
      expect(selectedType.prepareAndSendForDigestion).toHaveBeenCalledWith([], [], metadata);

      process.env.S3_ENABLED = originalS3Enabled;
    });

    test('should return internalServerError if uploadToS3 throws error', async () => {
      const originalS3Enabled = process.env.S3_ENABLED;
      process.env.S3_ENABLED = 'true';

      uploadToS3.mockRejectedValue(new Error('S3 upload failed'));

      await scoreRoute.execute(request, response);

      expect(responseService.internalServerError).toHaveBeenCalledWith(response, {
        error: 'Failed to score responses',
        message: 'S3 upload failed',
        timestamp
      });

      process.env.S3_ENABLED = originalS3Enabled;
    });

    test('should return internalServerError if sendMetadata throws error', async () => {
      const originalS3Enabled = process.env.S3_ENABLED;
      process.env.S3_ENABLED = 'true';

      uploadToS3.mockResolvedValue({
        totalItemCount: 10,
        s3Bucket: 'test-bucket',
        s3Path: 'test/path.json'
      });
      sendMetadata.mockRejectedValue(new Error('Metadata send failed'));

      await scoreRoute.execute(request, response);

      expect(responseService.internalServerError).toHaveBeenCalledWith(response, {
        error: 'Failed to score responses',
        message: 'Metadata send failed',
        timestamp
      });

      process.env.S3_ENABLED = originalS3Enabled;
    });
  });
});

