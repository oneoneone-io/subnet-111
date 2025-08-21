import types from './index.js';
import GoogleMapsReviews from './google-maps-reviews/index.js';

jest.mock('./google-maps-reviews/index.js', () => ({
  id: 'google-maps-reviews',
  name: 'Google Maps Reviews',
  createSyntheticTask: jest.fn(),
  score: jest.fn(),
  prepareAndSendForDigestion: jest.fn(),
}));

describe('utils/validator/types/index.js', () => {
  describe('.getTypeById()', () => {
    test('should return the correct type when given a valid id', () => {
      const result = types.getTypeById('google-maps-reviews');

      expect(result).toBe(GoogleMapsReviews);
      expect(result.id).toBe('google-maps-reviews');
      expect(result.name).toBe('Google Maps Reviews');
      expect(typeof result.createSyntheticTask).toBe('function');
      expect(typeof result.score).toBe('function');
      expect(typeof result.prepareAndSendForDigestion).toBe('function');
    });

    test('should return undefined when given an invalid id', () => {
      const result = types.getTypeById('non-existent-type');

      expect(result).toBeUndefined();
    });

    test('should return undefined when given null', () => {
      // eslint-disable-next-line unicorn/no-null
      const result = types.getTypeById(null);

      expect(result).toBeUndefined();
    });

    test('should return undefined when given undefined', () => {
      const result = types.getTypeById();

      expect(result).toBeUndefined();
    });

    test('should return undefined when given empty string', () => {
      const result = types.getTypeById('');

      expect(result).toBeUndefined();
    });

    test('should be case sensitive', () => {
      const result = types.getTypeById('Google-Maps-Reviews');

      expect(result).toBeUndefined();
    });
  });
});
