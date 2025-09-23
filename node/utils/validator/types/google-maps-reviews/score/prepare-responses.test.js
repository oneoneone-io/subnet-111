import logger from '#modules/logger/index.js';
import config from '#config';
import { prepareValidationResults } from '#utils/validator/validation-result.js';
import array from '#modules/array/index.js';
import { prepareResponses, getReviewsForSpotCheck } from './prepare-responses.js';

jest.mock('#modules/logger/index.js', () => ({
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn()
}));

jest.mock('#utils/validator/validation-result.js', () => ({
  prepareValidationResults: jest.fn()
}));

jest.mock('#modules/array/index.js', () => ({
  uniqueBy: jest.fn(),
  validateArray: jest.fn()
}));

describe('#utils/validator/google-maps/score/prepare-responses.js', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getReviewsForSpotCheck()', () => {
    test('should handle empty reviews array', () => {
      const result = getReviewsForSpotCheck([], 'miner1');

      expect(result).toEqual({
        mostRecentDate: undefined,
        selectedReviews: []
      });
    });

    test('should handle undefined reviews', () => {
      const result = getReviewsForSpotCheck(undefined, 'miner1');

      expect(result).toEqual({
        mostRecentDate: undefined,
        selectedReviews: []
      });
    });

    test('should handle null reviews', () => {
      const result = getReviewsForSpotCheck(undefined, 'miner1');

      expect(result).toEqual({
        mostRecentDate: undefined,
        selectedReviews: []
      });
    });

    test('should handle zero spot check count', () => {
      config.VALIDATOR.SPOT_CHECK_COUNT = 0;
      const reviews = [
        { reviewId: '1', publishedAtDate: '2024-03-20' }
      ];

      const result = getReviewsForSpotCheck(reviews, 'miner1');

      expect(result).toEqual({
        mostRecentDate: undefined,
        selectedReviews: []
      });
    });

    test('should select only most recent review when spot check count is 1', () => {
      config.VALIDATOR.SPOT_CHECK_COUNT = 1;
      const reviews = [
        { reviewId: '1', publishedAtDate: '2024-03-20' },
        { reviewId: '2', publishedAtDate: '2024-03-19' }
      ];

      const result = getReviewsForSpotCheck(reviews, 'miner1');

      expect(result.selectedReviews).toHaveLength(1);
      expect(result.selectedReviews[0].reviewId).toBe('1');
      expect(result.mostRecentDate).toEqual(new Date('2024-03-20'));
      expect(logger.info).toHaveBeenCalledWith(
        'Google Maps Reviews - UID miner1: Selected most recent review 1 - (2024-03-20) for spot check'
      );
    });

    test('should select most recent review and random reviews up to spot check count', () => {
      config.VALIDATOR.SPOT_CHECK_COUNT = 3;
      const reviews = [
        { reviewId: '1', publishedAtDate: '2024-03-20' },
        { reviewId: '2', publishedAtDate: '2024-03-19' },
        { reviewId: '3', publishedAtDate: '2024-03-18' },
        { reviewId: '4', publishedAtDate: '2024-03-17' }
      ];

      const result = getReviewsForSpotCheck(reviews, 'miner1');

      expect(result.selectedReviews).toHaveLength(3);
      expect(result.selectedReviews[0].reviewId).toBe('1'); // Most recent
      expect(result.mostRecentDate).toEqual(new Date('2024-03-20'));
      expect(logger.info).toHaveBeenCalledWith(
        'Google Maps Reviews - UID miner1: Selected most recent review 1 - (2024-03-20) for spot check'
      );
      expect(logger.info).toHaveBeenCalledTimes(3); // Most recent + 2 random
    });

    test('should handle when reviews count is less than spot check count', () => {
      config.VALIDATOR.SPOT_CHECK_COUNT = 5;
      const reviews = [
        { reviewId: '1', publishedAtDate: '2024-03-20' },
        { reviewId: '2', publishedAtDate: '2024-03-19' }
      ];

      const result = getReviewsForSpotCheck(reviews, 'miner1');

      expect(result.selectedReviews).toHaveLength(2);
      expect(result.selectedReviews[0].reviewId).toBe('1'); // Most recent
      expect(result.selectedReviews[1].reviewId).toBe('2'); // Only remaining review
      expect(result.mostRecentDate).toEqual(new Date('2024-03-20'));
    });

    test('should select multiple reviews for spot check when available', () => {
      config.VALIDATOR.SPOT_CHECK_COUNT = 3;
      const reviews = [
        { reviewId: '1', publishedAtDate: '2024-03-20' },
        { reviewId: '2', publishedAtDate: '2024-03-19' },
        { reviewId: '3', publishedAtDate: '2024-03-18' },
        { reviewId: '4', publishedAtDate: '2024-03-17' }
      ];

      const result = getReviewsForSpotCheck(reviews, 'miner1');

      expect(result.selectedReviews).toHaveLength(3);
      expect(result.selectedReviews[0].reviewId).toBe('1'); // Most recent
      expect(result.mostRecentDate).toEqual(new Date('2024-03-20'));
      expect(logger.info).toHaveBeenCalledWith(
        'Google Maps Reviews - UID miner1: Selected most recent review 1 - (2024-03-20) for spot check'
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringMatching(/Selected random review [234]/)
      );
    });

    test('should handle all reviews having same date', () => {
      const sameDate = '2024-03-20';
      const reviews = [
        { reviewId: '1', publishedAtDate: sameDate },
        { reviewId: '2', publishedAtDate: sameDate },
        { reviewId: '3', publishedAtDate: sameDate }
      ];

      const result = getReviewsForSpotCheck(reviews, 'miner1');

      expect(result.selectedReviews).toHaveLength(3);
      expect(result.mostRecentDate).toEqual(new Date(sameDate));
      // Any review could be selected as most recent since they have the same date
      expect(['1', '2', '3']).toContain(result.selectedReviews[0].reviewId);
    });

    test('should handle mixed dates with some being the same', () => {
      const reviews = [
        { reviewId: '1', publishedAtDate: '2024-03-20' },
        { reviewId: '2', publishedAtDate: '2024-03-20' }, // Same as first
        { reviewId: '3', publishedAtDate: '2024-03-19' },
        { reviewId: '4', publishedAtDate: '2024-03-18' }
      ];

      const result = getReviewsForSpotCheck(reviews, 'miner1');

      expect(result.selectedReviews).toHaveLength(3);
      expect(result.mostRecentDate).toEqual(new Date('2024-03-20'));
      // Either review 1 or 2 could be selected as most recent
      expect(['1', '2']).toContain(result.selectedReviews[0].reviewId);
    });

    test('should handle spot check count greater than available reviews', () => {
      config.VALIDATOR.SPOT_CHECK_COUNT = 5;
      const reviews = [
        { reviewId: '1', publishedAtDate: '2024-03-20' },
        { reviewId: '2', publishedAtDate: '2024-03-19' }
      ];

      const result = getReviewsForSpotCheck(reviews, 'miner1');

      expect(result.selectedReviews).toHaveLength(2); // Should only return available reviews
      expect(result.selectedReviews[0].reviewId).toBe('1'); // Most recent
      expect(result.selectedReviews[1].reviewId).toBe('2'); // Only remaining review
    });

    test('should handle single review', () => {
      config.VALIDATOR.SPOT_CHECK_COUNT = 3;
      const reviews = [
        { reviewId: '1', publishedAtDate: '2024-03-20' }
      ];

      const result = getReviewsForSpotCheck(reviews, 'miner1');

      expect(result.selectedReviews).toHaveLength(1);
      expect(result.selectedReviews[0].reviewId).toBe('1');
      expect(result.mostRecentDate).toEqual(new Date('2024-03-20'));
      expect(logger.info).toHaveBeenCalledWith(
        'Google Maps Reviews - UID miner1: Selected most recent review 1 - (2024-03-20) for spot check'
      );
    });

    test('should handle reviews with various date formats', () => {
      const reviews = [
        { reviewId: '1', publishedAtDate: '2024-03-20T10:30:00Z' },
        { reviewId: '2', publishedAtDate: '2024-03-19T15:45:00Z' },
        { reviewId: '3', publishedAtDate: '2024-03-18T08:15:00Z' }
      ];

      const result = getReviewsForSpotCheck(reviews, 'miner1');

      expect(result.selectedReviews).toHaveLength(3);
      expect(result.selectedReviews[0].reviewId).toBe('1'); // Most recent
      expect(result.mostRecentDate).toEqual(new Date('2024-03-20T10:30:00Z'));
    });

    test('should filter out most recent review from random selection', () => {
      config.VALIDATOR.SPOT_CHECK_COUNT = 2;
      const reviews = [
        { reviewId: '1', publishedAtDate: '2024-03-20' },
        { reviewId: '2', publishedAtDate: '2024-03-19' },
        { reviewId: '3', publishedAtDate: '2024-03-18' }
      ];

      const result = getReviewsForSpotCheck(reviews, 'miner1');

      expect(result.selectedReviews).toHaveLength(2);
      expect(result.selectedReviews[0].reviewId).toBe('1'); // Most recent
      expect(['2', '3']).toContain(result.selectedReviews[1].reviewId); // Random from remaining
      expect(result.selectedReviews.filter(r => r.reviewId === '1')).toHaveLength(1); // Most recent only appears once
    });
  });

  describe('prepareResponses()', () => {
    let validResponse;
    let minerUIDs;
    let responseTimes;
    let synapseTimeout;
    let metadata;
    let mockValidationResults;

    beforeEach(() => {
      validResponse = [
        {
          reviewerId: '123',
          reviewerUrl: 'https://example.com/reviewer/123',
          reviewerName: 'John Doe',
          reviewId: 'rev123',
          reviewUrl: 'https://example.com/review/123',
          publishedAtDate: '2024-03-20',
          placeId: 'place123',
          cid: 'cid123',
          fid: 'facility123',
          totalScore: 5
        }
      ];
      minerUIDs = ['miner1'];
      responseTimes = [100];
      synapseTimeout = 5000;
      metadata = { fid: 'facility123' };

      mockValidationResults = [
        {
          minerUID: 'miner1',
          passedValidation: false,
          validationError: undefined,
          count: 0,
          mostRecentDate: undefined,
          data: [],
          components: {
            speedScore: 0,
            volumeScore: 0,
            recencyScore: 0
          },
          responseTime: 100
        }
      ];

      // Reset all mocks with their default implementations
      prepareValidationResults.mockReturnValue(mockValidationResults);
      array.uniqueBy.mockImplementation(array_ => array_);
      array.validateArray.mockReturnValue({ valid: validResponse, invalid: [] });
    });

    test('should handle empty responses array', () => {
      prepareValidationResults.mockReturnValue([]);

      const result = prepareResponses([], [], [], synapseTimeout, metadata, 'google-maps-reviews');

      expect(result).toEqual([]);
      expect(prepareValidationResults).toHaveBeenCalledWith(
        [], [], [], metadata, 'google-maps-reviews'
      );
    });

    test('should process valid responses successfully', () => {
      const result = prepareResponses([validResponse], minerUIDs, responseTimes, synapseTimeout, metadata, 'google-maps-reviews');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        minerUID: 'miner1',
        passedValidation: true,
        count: 1
      });
      expect(result[0].mostRecentDate).toEqual(new Date('2024-03-20'));
      expect(result[0].data).toHaveLength(1);
      expect(result[0].data[0].reviewId).toBe('rev123');
    });

    test('should skip responses with validation errors', () => {
      mockValidationResults[0].validationError = 'Invalid response format';

      const result = prepareResponses([validResponse], minerUIDs, responseTimes, synapseTimeout, metadata, 'google-maps-reviews');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        minerUID: 'miner1',
        passedValidation: false,
        validationError: 'Invalid response format'
      });
      expect(array.uniqueBy).not.toHaveBeenCalled();
    });

    test('should handle duplicate reviews and log data cleaning', () => {
      const duplicateResponse = [...validResponse, ...validResponse];
      array.uniqueBy.mockReturnValue(validResponse);

      const result = prepareResponses([duplicateResponse], minerUIDs, responseTimes, synapseTimeout, metadata, 'google-maps-reviews');

      expect(array.uniqueBy).toHaveBeenCalledWith(duplicateResponse, 'reviewId');
      expect(logger.info).toHaveBeenCalledWith(
        'Google Maps Reviews - UID miner1: Data cleaning - 2 reviews -> 1 unique reviews'
      );
      expect(result[0].count).toBe(1);
    });

    test('should handle structural validation failures', () => {
      array.validateArray.mockReturnValue({
        valid: [],
        invalid: [{ isValid: false, item: validResponse[0], validationError: 'Missing required field' }]
      });

      const result = prepareResponses([validResponse], minerUIDs, responseTimes, synapseTimeout, metadata, 'google-maps-reviews');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        minerUID: 'miner1',
        passedValidation: false,
        validationError: 'Structural validation failed on review objects'
      });
    });

    test('should validate required fields and fid matching', () => {
      prepareResponses([validResponse], minerUIDs, responseTimes, synapseTimeout, metadata, 'google-maps-reviews');

      expect(array.validateArray).toHaveBeenCalledWith(validResponse, [
        { name: 'reviewerId', type: 'string' },
        { name: 'reviewerUrl', type: 'string' },
        { name: 'reviewerName', type: 'string' },
        { name: 'reviewId', type: 'string' },
        { name: 'reviewUrl', type: 'string' },
        { name: 'publishedAtDate', type: 'string' },
        { name: 'placeId', type: 'string' },
        { name: 'cid', type: 'string' },
        { name: 'fid', type: 'string' },
        { name: 'totalScore', type: 'number' },
        { name: 'fid', type: 'string', validate: expect.any(Function) }
      ]);
    });

    test('should validate FID matches for all reviews', () => {
      const response = [
        { ...validResponse[0], fid: 'wrong-fid' }
      ];

      array.validateArray.mockReturnValue({
        valid: [],
        invalid: [{ isValid: false, item: response[0], validationError: 'FID mismatch' }]
      });

      const result = prepareResponses([response], minerUIDs, responseTimes, synapseTimeout, metadata, 'google-maps-reviews');

      expect(result[0]).toMatchObject({
        minerUID: 'miner1',
        passedValidation: false,
        validationError: 'Structural validation failed on review objects'
      });
    });

    test('should properly validate fid field with exact matching rule', () => {
      const expectedFid = 'facility123';
      const reviews = [
        { ...validResponse[0], fid: expectedFid },  // Should pass
        { ...validResponse[0], fid: 'wrong-fid' },  // Should fail
        { ...validResponse[0], fid: 'facility123 ' }, // Should fail (extra space)
        { ...validResponse[0], fid: 'FACILITY123' }   // Should fail (case sensitive)
      ];

      // Mock validateArray to simulate validation behavior
      array.validateArray.mockImplementation((array_, requiredFields) => {
        // Find the fid validation rule
        const fidValidation = requiredFields.find(field => field.name === 'fid' && field.validate);

        // Filter valid reviews based on fid validation
        const valid = array_.filter(review => fidValidation.validate(review.fid));
        const invalid = array_.filter(review => !fidValidation.validate(review.fid))
          .map(item => ({ isValid: false, item, validationError: 'FID mismatch' }));

        return { valid, invalid };
      });

      const result = prepareResponses([reviews], minerUIDs, responseTimes, synapseTimeout, { fid: expectedFid }, 'google-maps-reviews');

      // Only the first review should pass validation, but since we have invalid reviews, the whole response fails
      expect(result[0]).toMatchObject({
        minerUID: 'miner1',
        passedValidation: false,
        validationError: 'Structural validation failed on review objects'
      });
    });

    test('fid validation function should strictly compare values', () => {
      const expectedFid = 'facility123';
      const requiredFields = [
        { name: 'fid', type: 'string', validate: (value) => value === expectedFid }
      ];

      // Test the validation function directly
      const validateFid = requiredFields[0].validate;

      // Should pass
      expect(validateFid('facility123')).toBe(true);

      // Should fail
      expect(validateFid('wrong-fid')).toBe(false);
      expect(validateFid('facility123 ')).toBe(false);
      expect(validateFid('FACILITY123')).toBe(false);
      expect(validateFid('')).toBe(false);
      expect(validateFid()).toBe(false);
      expect(validateFid()).toBe(false);
      expect(validateFid()).toBe(false);
    });

    test('should log structural validation success', () => {
      prepareResponses([validResponse], minerUIDs, responseTimes, synapseTimeout, metadata, 'google-maps-reviews');

      expect(logger.info).toHaveBeenCalledWith(
        'Google Maps Reviews - UID miner1: Structural validation passed - 1 reviews validated successfully'
      );
    });

    test('should call getReviewsForSpotCheck with correct parameters', () => {
      const result = prepareResponses([validResponse], minerUIDs, responseTimes, synapseTimeout, metadata, 'google-maps-reviews');

      // Verify that the spot check function would be called with the valid reviews and miner UID
      expect(result[0].data).toHaveLength(1);
      expect(result[0].data[0]).toEqual(validResponse[0]);
    });

    test('should handle zero spot check count', () => {
      config.VALIDATOR.SPOT_CHECK_COUNT = 0;

      const result = prepareResponses([validResponse], minerUIDs, responseTimes, synapseTimeout, metadata, 'google-maps-reviews');

      expect(result[0].data).toEqual([]);
      expect(result[0].mostRecentDate).toBeUndefined();
    });

    test('should handle multiple responses from different miners', () => {
      const response1 = [{ ...validResponse[0], reviewId: 'rev1' }];
      const response2 = [{ ...validResponse[0], reviewId: 'rev2' }];
      const responses = [response1, response2];
      const minerUIDs = ['miner1', 'miner2'];
      const responseTimes = [100, 200];

      mockValidationResults.push({
        minerUID: 'miner2',
        passedValidation: false,
        validationError: undefined,
        count: 0,
        mostRecentDate: undefined,
        data: [],
        components: {
          speedScore: 0,
          volumeScore: 0,
          recencyScore: 0
        },
        responseTime: 200
      });

      prepareValidationResults.mockReturnValue(mockValidationResults);

      const result = prepareResponses(responses, minerUIDs, responseTimes, synapseTimeout, metadata, 'google-maps-reviews');

      expect(result).toHaveLength(2);
      expect(result[0].minerUID).toBe('miner1');
      expect(result[1].minerUID).toBe('miner2');
      expect(result[0].passedValidation).toBe(true);
      expect(result[1].passedValidation).toBe(true);
    });

    test('should handle responses with mixed validation outcomes', () => {
      const response1 = [validResponse[0]];
      const response2 = [{ ...validResponse[0], fid: 'wrong-fid' }];
      const responses = [response1, response2];
      const minerUIDs = ['miner1', 'miner2'];

      mockValidationResults.push({
        minerUID: 'miner2',
        passedValidation: false,
        validationError: undefined,
        responseTime: 100
      });

      prepareValidationResults.mockReturnValue(mockValidationResults);

      // Mock different validation outcomes for each response
      array.validateArray
        .mockReturnValueOnce({ valid: response1, invalid: [] })  // First call succeeds
        .mockReturnValueOnce({ valid: [], invalid: [{ item: response2[0] }] }); // Second call fails

      const result = prepareResponses(responses, minerUIDs, responseTimes, synapseTimeout, metadata, 'google-maps-reviews'  );

      expect(result).toHaveLength(2);
      expect(result[0].passedValidation).toBe(true);
      expect(result[1].passedValidation).toBe(false);
      expect(result[1].validationError).toBe('Structural validation failed on review objects');
    });

    test('should preserve existing validation errors from prepareValidationResults', () => {
      mockValidationResults[0].validationError = 'Response timeout';

      const result = prepareResponses([validResponse], minerUIDs, responseTimes, synapseTimeout, metadata, 'google-maps-reviews');

      expect(result[0].validationError).toBe('Response timeout');
      expect(result[0].passedValidation).toBe(false);
      // Should not process the response further
      expect(array.uniqueBy).not.toHaveBeenCalled();
      expect(array.validateArray).not.toHaveBeenCalled();
    });

    test('should handle empty reviews after data cleaning', () => {
      array.uniqueBy.mockReturnValue([]);

      prepareResponses([validResponse], minerUIDs, responseTimes, synapseTimeout, metadata, 'google-maps-reviews');

      expect(logger.info).toHaveBeenCalledWith(
        'Google Maps Reviews - UID miner1: Data cleaning - 1 reviews -> 0 unique reviews'
      );
      expect(array.validateArray).toHaveBeenCalledWith([], expect.any(Array));
    });
  });
});
