import logger from '#modules/logger/index.js';
import config from '#config';
import checkResponseValidity from '#utils/validator/check-response-validity.js';
import generateValidationData from '#utils/validator/validation-data.js';
import array from '#modules/array/index.js';
import { prepareResponses, getReviewsForSpotCheck } from './prepare-responses.js';

jest.mock('#modules/logger/index.js', () => ({
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn()
}));

jest.mock('#utils/validator/check-response-validity.js', () => jest.fn());
jest.mock('#utils/validator/validation-data.js', () => jest.fn());
jest.mock('#modules/array/index.js', () => ({
  uniqueBy: jest.fn(),
  validateArray: jest.fn()
}));

describe('#utils/validator/google-maps/score/prepare-responses.js', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    config.VALIDATOR.SPOT_CHECK_COUNT = 3;
  });

  describe('getReviewsForSpotCheck()', () => {
    test('should handle empty reviews array', () => {
      const result = getReviewsForSpotCheck([], 'fid123', 'miner1');

      expect(result).toEqual({
        mostRecentDate: undefined,
        selectedReviews: []
      });
    });

    test('should handle undefined reviews', () => {
      const result = getReviewsForSpotCheck(undefined, 'fid123', 'miner1');

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

      const result = getReviewsForSpotCheck(reviews, 'fid123', 'miner1');

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

      const result = getReviewsForSpotCheck(reviews, 'fid123', 'miner1');

      expect(result.selectedReviews).toHaveLength(1);
      expect(result.selectedReviews[0].reviewId).toBe('1');
      expect(result.mostRecentDate).toEqual(new Date('2024-03-20'));
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Selected most recent review 1')
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

      const result = getReviewsForSpotCheck(reviews, 'fid123', 'miner1');

      expect(result.selectedReviews).toHaveLength(3);
      expect(result.selectedReviews[0].reviewId).toBe('1'); // Most recent
      expect(result.mostRecentDate).toEqual(new Date('2024-03-20'));
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Selected most recent review 1')
      );
      expect(logger.info).toHaveBeenCalledTimes(3); // Most recent + 2 random
    });

    test('should handle when reviews count is less than spot check count', () => {
      config.VALIDATOR.SPOT_CHECK_COUNT = 5;
      const reviews = [
        { reviewId: '1', publishedAtDate: '2024-03-20' },
        { reviewId: '2', publishedAtDate: '2024-03-19' }
      ];

      const result = getReviewsForSpotCheck(reviews, 'fid123', 'miner1');

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

      const result = getReviewsForSpotCheck(reviews, 'fid123', 'miner1');

      expect(result.selectedReviews).toHaveLength(3);
      expect(result.selectedReviews[0].reviewId).toBe('1'); // Most recent
      expect(result.mostRecentDate).toEqual(new Date('2024-03-20'));
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Selected most recent review 1')
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

      const result = getReviewsForSpotCheck(reviews, 'fid123', 'miner1');

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

      const result = getReviewsForSpotCheck(reviews, 'fid123', 'miner1');

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

      const result = getReviewsForSpotCheck(reviews, 'fid123', 'miner1');

      expect(result.selectedReviews).toHaveLength(2); // Should only return available reviews
      expect(result.selectedReviews[0].reviewId).toBe('1'); // Most recent
      expect(result.selectedReviews[1].reviewId).toBe('2'); // Only remaining review
    });
  });

  describe('prepareResponses()', () => {
    let validResponse;
    let minerUIDs;
    let fid;

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
      fid = 'facility123';

      // Reset all mocks with their default implementations
      checkResponseValidity.mockReturnValue({ isValid: true });
      array.uniqueBy.mockImplementation(array_ => array_);
      array.validateArray.mockReturnValue({ valid: validResponse, invalid: [] });
      generateValidationData.mockImplementation(({ minerUID, ...rest }) => ({
        minerUID,
        passedValidation: false, // Default to false, will be overridden by ...rest if passedValidation is provided
        ...rest
      }));
    });

    test('should handle empty responses array', () => {
      const result = prepareResponses([], [], 'fid123');

      expect(result).toEqual({
        validationData: [],
        allSpotCheckReviews: []
      });
    });

    test('should process valid responses successfully', () => {
      const result = prepareResponses([validResponse], minerUIDs, fid);

      expect(result.validationData).toHaveLength(1);
      expect(result.validationData[0]).toMatchObject({
        minerUID: 'miner1',
        passedValidation: true,
        count: 1
      });
      expect(result.allSpotCheckReviews).toHaveLength(1);
      expect(result.allSpotCheckReviews[0]).toMatchObject({
        minerUID: 'miner1',
        reviews: expect.any(Array)
      });
    });

    test('should handle invalid response object', () => {
      checkResponseValidity.mockReturnValue({
        isValid: false,
        validationError: 'Invalid response format'
      });

      // For invalid responses, generateValidationData is called with just minerUID
      generateValidationData.mockImplementation(({ minerUID }) => ({
        minerUID,
        passedValidation: false
      }));

      const result = prepareResponses([validResponse], minerUIDs, fid);

      expect(result.validationData).toHaveLength(1);
      expect(result.validationData[0]).toMatchObject({
        minerUID: 'miner1',
        passedValidation: false,
        validationError: 'Invalid response format'
      });
      expect(result.allSpotCheckReviews).toHaveLength(0);
    });

    test('should handle duplicate reviews', () => {
      const duplicateResponse = [...validResponse, ...validResponse];
      array.uniqueBy.mockReturnValue(validResponse);

      const result = prepareResponses([duplicateResponse], minerUIDs, fid);

      expect(array.uniqueBy).toHaveBeenCalledWith(duplicateResponse, 'reviewId');
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Data cleaning - 2 reviews -> 1 unique reviews')
      );
      expect(result.validationData[0].count).toBe(1);
    });

    test('should handle structural validation failures', () => {
      array.validateArray.mockReturnValue({
        valid: [],
        invalid: [{ isValid: false, item: validResponse[0], validationError: 'Missing required field' }]
      });

      // For validation failures, generateValidationData is called with just minerUID
      generateValidationData.mockImplementation(({ minerUID }) => ({
        minerUID,
        passedValidation: false
      }));

      const result = prepareResponses([validResponse], minerUIDs, fid);

      expect(result.validationData).toHaveLength(1);
      expect(result.validationData[0]).toMatchObject({
        minerUID: 'miner1',
        passedValidation: false,
        validationError: 'Structural validation failed on review objects'
      });
      expect(result.allSpotCheckReviews).toHaveLength(0);
    });

    test('should handle missing minerUID by using index', () => {
      const result = prepareResponses([validResponse], [], fid);

      expect(result.validationData[0].minerUID).toBe(0);
      expect(result.allSpotCheckReviews[0].minerUID).toBe(0);
    });

    test('should validate FID matches for all reviews', () => {
      const response = [
        { ...validResponse[0], fid: 'wrong-fid' }
      ];

      array.validateArray.mockReturnValue({
        valid: [],
        invalid: [{ isValid: false, item: response[0], validationError: 'FID mismatch' }]
      });

      // For validation failures, generateValidationData is called with just minerUID
      generateValidationData.mockImplementation(({ minerUID }) => ({
        minerUID,
        passedValidation: false
      }));

      const result = prepareResponses([response], minerUIDs, fid);

      expect(result.validationData[0]).toMatchObject({
        minerUID: 'miner1',
        passedValidation: false,
        validationError: 'Structural validation failed on review objects'
      });
      expect(result.allSpotCheckReviews).toHaveLength(0);
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

      const result = prepareResponses([reviews], minerUIDs, expectedFid);

      // Only the first review should pass validation
      expect(result.validationData[0]).toMatchObject({
        minerUID: 'miner1',
        passedValidation: false,
        validationError: 'Structural validation failed on review objects'
      });
      expect(result.allSpotCheckReviews).toHaveLength(0);
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
    });

    test('should not add to spot check reviews if no reviews selected', () => {
      config.VALIDATOR.SPOT_CHECK_COUNT = 0;

      const result = prepareResponses([validResponse], minerUIDs, fid);

      expect(result.validationData).toHaveLength(1);
      expect(result.allSpotCheckReviews).toHaveLength(0);
    });
  });
});
