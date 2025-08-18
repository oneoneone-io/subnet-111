import logger from '#modules/logger/index.js';
import validateMinerAgainstBatch from './validate-miner-against-batch.js';

jest.mock('#modules/logger/index.js', () => ({
  error: jest.fn(),
  info: jest.fn(),
}));

describe('#utils/validator/google-maps/score/validate-miner-against-batch.js', () => {
  const fid = 'test-fid-123';
  const minerUID = 'test-miner-456';
  let reviews;
  let verifiedReviewsMap;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup base test data
    reviews = [{
      reviewId: 'review123',
      reviewerId: 'reviewer123',
      placeId: 'place123',
      text: 'Great place!',
      lastEditedAtDate: '2024-03-20T10:00:00.000Z',
      fid: 'test-fid-123'
    }];

    verifiedReviewsMap = new Map([
      ['review123', {
        reviewId: 'review123',
        reviewerId: 'reviewer123',
        placeId: 'place123',
        text: 'Great place!',
        publishedAtDate: '2024-03-20T10:00:00.000Z',
        fid: 'test-fid-123'
      }]
    ]);
  });

  describe('validateMinerAgainstBatch', () => {
    test('should return true when all reviews match exactly', () => {
      const result = validateMinerAgainstBatch(reviews, fid, minerUID, verifiedReviewsMap);
      expect(result).toBe(true);
      expect(logger.error).not.toHaveBeenCalled();
    });

    test('should return false when reviewId is not found in verified map', () => {
      verifiedReviewsMap = new Map();
      const result = validateMinerAgainstBatch(reviews, fid, minerUID, verifiedReviewsMap);
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('No verified review found for reviewId review123')
      );
    });

    test('should return false when fid does not match', () => {
      verifiedReviewsMap.set('review123', {
        ...verifiedReviewsMap.get('review123'),
        fid: 'different-fid'
      });
      const result = validateMinerAgainstBatch(reviews, fid, minerUID, verifiedReviewsMap);
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('fid mismatch')
      );
    });

    test('should return false when reviewerId does not match', () => {
      verifiedReviewsMap.set('review123', {
        ...verifiedReviewsMap.get('review123'),
        reviewerId: 'different-reviewer'
      });
      const result = validateMinerAgainstBatch(reviews, fid, minerUID, verifiedReviewsMap);
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('reviewerId mismatch')
      );
    });

    test('should return false when placeId does not match', () => {
      verifiedReviewsMap.set('review123', {
        ...verifiedReviewsMap.get('review123'),
        placeId: 'different-place'
      });
      const result = validateMinerAgainstBatch(reviews, fid, minerUID, verifiedReviewsMap);
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('placeId mismatch')
      );
    });

    test('should return false when review text does not match', () => {
      verifiedReviewsMap.set('review123', {
        ...verifiedReviewsMap.get('review123'),
        text: 'Different review text'
      });
      const result = validateMinerAgainstBatch(reviews, fid, minerUID, verifiedReviewsMap);
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Text mismatch')
      );
    });

    test('should handle null/undefined text values correctly', () => {
      reviews[0].text = undefined;
      verifiedReviewsMap.set('review123', {
        ...verifiedReviewsMap.get('review123'),
        text: undefined
      });
      const result = validateMinerAgainstBatch(reviews, fid, minerUID, verifiedReviewsMap);
      expect(result).toBe(true);
      expect(logger.error).not.toHaveBeenCalled();
    });

    test('should return false when dates do not match', () => {
      verifiedReviewsMap.set('review123', {
        ...verifiedReviewsMap.get('review123'),
        publishedAtDate: '2024-03-21T10:00:00.000Z'
      });
      const result = validateMinerAgainstBatch(reviews, fid, minerUID, verifiedReviewsMap);
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Date mismatch')
      );
    });

    test('should ignore milliseconds in date comparison', () => {
      reviews[0].lastEditedAtDate = '2024-03-20T10:00:00.123Z';
      verifiedReviewsMap.set('review123', {
        ...verifiedReviewsMap.get('review123'),
        publishedAtDate: '2024-03-20T10:00:00.456Z'
      });
      const result = validateMinerAgainstBatch(reviews, fid, minerUID, verifiedReviewsMap);
      expect(result).toBe(true);
      expect(logger.error).not.toHaveBeenCalled();
    });

    test('should validate multiple reviews correctly', () => {
      reviews.push({
        reviewId: 'review456',
        reviewerId: 'reviewer456',
        placeId: 'place123',
        text: 'Another great review!',
        lastEditedAtDate: '2024-03-21T10:00:00.000Z',
        fid: 'test-fid-123'
      });

      verifiedReviewsMap.set('review456', {
        reviewId: 'review456',
        reviewerId: 'reviewer456',
        placeId: 'place123',
        text: 'Another great review!',
        publishedAtDate: '2024-03-21T10:00:00.000Z',
        fid: 'test-fid-123'
      });

      const result = validateMinerAgainstBatch(reviews, fid, minerUID, verifiedReviewsMap);
      expect(result).toBe(true);
      expect(logger.error).not.toHaveBeenCalled();
    });

    test('should handle empty reviews array', () => {
      const result = validateMinerAgainstBatch([], fid, minerUID, verifiedReviewsMap);
      expect(result).toBe(true);
      expect(logger.error).not.toHaveBeenCalled();
    });
  });
});
