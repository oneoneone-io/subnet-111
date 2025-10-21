import googleMapsReviewsType from './index.js';

// Mock the fetch module to avoid import issues
jest.mock('./fetch/index.js', () => ({
  __esModule: true,
  default: jest.fn()
}));

describe('utils/miner/types/google-maps-reviews/index.js', () => {
  test('should export the correct type structure', () => {
    expect(googleMapsReviewsType).toEqual({
      id: 'google-maps-reviews',
      fetch: expect.any(Function)
    });
  });

  test('should have the correct id', () => {
    expect(googleMapsReviewsType.id).toBe('google-maps-reviews');
  });

  test('should export fetch function', () => {
    expect(typeof googleMapsReviewsType.fetch).toBe('function');
  });
});
