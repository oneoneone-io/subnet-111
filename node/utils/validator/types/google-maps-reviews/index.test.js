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
