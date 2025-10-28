import types from './index.js';
import GoogleMapsReviews from './google-maps-reviews/index.js';
import XTweets from './x-tweets/index.js';

jest.mock('./google-maps-reviews/index.js', () => ({
  id: 'google-maps-reviews',
  fetch: jest.fn(),
}));

jest.mock('./x-tweets/index.js', () => ({
  id: 'x-tweets',
  fetch: jest.fn(),
}));

describe('utils/miner/types/index.js', () => {
  describe('.getTypeById()', () => {
    test('should return the correct type when given a valid id', () => {
      const result = types.getTypeById('google-maps-reviews');

      expect(result).toBe(GoogleMapsReviews);
      expect(result.id).toBe('google-maps-reviews');
      expect(typeof result.fetch).toBe('function');
    });

    test('should return the correct type for x-tweets', () => {
      const result = types.getTypeById('x-tweets');

      expect(result).toBe(XTweets);
      expect(result.id).toBe('x-tweets');
      expect(typeof result.fetch).toBe('function');
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

    test('should return undefined when given a number', () => {
      const result = types.getTypeById(123);

      expect(result).toBeUndefined();
    });

    test('should return undefined when given an object', () => {
      const result = types.getTypeById({});

      expect(result).toBeUndefined();
    });

    test('should return undefined when given an array', () => {
      const result = types.getTypeById([]);

      expect(result).toBeUndefined();
    });

    test('should return undefined when given a boolean', () => {
      const result = types.getTypeById(true);

      expect(result).toBeUndefined();
    });
  });
});
