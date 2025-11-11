import googleMapsReviewsValidatorType from './index.js';

// Mock the modules to avoid import issues
jest.mock('./create-synthetic/index.js', () => ({
  __esModule: true,
  default: jest.fn()
}));
jest.mock('./score/index.js', () => ({
  __esModule: true,
  default: jest.fn()
}));
jest.mock('./score/prepare-and-send-for-digestion.js', () => ({
  __esModule: true,
  default: jest.fn()
}));

describe('utils/validator/types/google-maps-reviews/index.js', () => {
  test('should export the correct validator type structure', () => {
    expect(googleMapsReviewsValidatorType).toEqual({
      id: 'google-maps-reviews',
      name: 'Google Maps Reviews',
      s3: {
        idField: 'reviewId',
        stripFields: ['reviewId', 'reviewUrl', 'placeId', 'cid', 'fid', 'url'],
        getS3Identifier: expect.any(Function),
      },
      scoreConstants: {
        SPEED: 0.3,
        VOLUME: 0.5,
        RECENCY: 0.2,
      },
      createSyntheticTask: expect.any(Function),
      score: expect.any(Function),
      prepareAndSendForDigestion: expect.any(Function)
    });
  });

  test('should have the correct id', () => {
    expect(googleMapsReviewsValidatorType.id).toBe('google-maps-reviews');
  });

  test('should have the correct name', () => {
    expect(googleMapsReviewsValidatorType.name).toBe('Google Maps Reviews');
  });

  test('should have the correct s3 structure', () => {
    expect(googleMapsReviewsValidatorType.s3).toEqual({
      idField: 'reviewId',
      stripFields: ['reviewId', 'reviewUrl', 'placeId', 'cid', 'fid', 'url'],
      getS3Identifier: expect.any(Function),
    });
  });
  test('should export createSyntheticTask function', () => {
    expect(typeof googleMapsReviewsValidatorType.createSyntheticTask).toBe('function');
  });

  test('should export score function', () => {
    expect(typeof googleMapsReviewsValidatorType.score).toBe('function');
  });

  test('should export prepareAndSendForDigestion function', () => {
    expect(typeof googleMapsReviewsValidatorType.prepareAndSendForDigestion).toBe('function');
  });
});
