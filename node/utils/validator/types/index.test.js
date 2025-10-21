import types from './index.js';
import GoogleMapsReviews from './google-maps-reviews/index.js';
import XTweets from './x-tweets/index.js';

jest.mock('./google-maps-reviews/index.js', () => ({
  id: 'google-maps-reviews',
  name: 'Google Maps Reviews',
  createSyntheticTask: jest.fn(),
  score: jest.fn(),
  prepareAndSendForDigestion: jest.fn(),
}));

jest.mock('./x-tweets/index.js', () => ({
  id: 'x-tweets',
  name: 'X Tweets',
  createSyntheticTask: jest.fn(),
  score: jest.fn(),
  prepareAndSendForDigestion: jest.fn(),
}));

describe('utils/validator/types/index.js', () => {
  describe('.getTypeById()', () => {
    test('should return the correct type when given a valid google-maps-reviews id', () => {
      const result = types.getTypeById('google-maps-reviews');

      expect(result).toBe(GoogleMapsReviews);
      expect(result.id).toBe('google-maps-reviews');
      expect(result.name).toBe('Google Maps Reviews');
      expect(typeof result.createSyntheticTask).toBe('function');
      expect(typeof result.score).toBe('function');
      expect(typeof result.prepareAndSendForDigestion).toBe('function');
    });

    test('should return the correct type when given a valid x-tweets id', () => {
      const result = types.getTypeById('x-tweets');

      expect(result).toBe(XTweets);
      expect(result.id).toBe('x-tweets');
      expect(result.name).toBe('X Tweets');
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

  describe('.getRandomType()', () => {
    test('should return a valid type from the TYPES array', () => {
      const result = types.getRandomType();

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(typeof result.id).toBe('string');
      expect(typeof result.name).toBe('string');
      expect(typeof result.createSyntheticTask).toBe('function');
      expect(typeof result.score).toBe('function');
      expect(typeof result.prepareAndSendForDigestion).toBe('function');
    });

    test('should return a valid type from available types', () => {
      const result = types.getRandomType();

      expect(result).toBeDefined();
      expect([GoogleMapsReviews, XTweets]).toContain(result);
      expect(['google-maps-reviews', 'x-tweets']).toContain(result.id);
    });

    test('should return consistent structure across multiple calls', () => {
      const results = Array.from({ length: 10 }, () => types.getRandomType());

      for (const result of results) {
        expect(result).toBeDefined();
        expect(typeof result.id).toBe('string');
        expect(typeof result.name).toBe('string');
        expect(typeof result.createSyntheticTask).toBe('function');
        expect(typeof result.score).toBe('function');
        expect(typeof result.prepareAndSendForDigestion).toBe('function');
      }
    });

    test('should return both types over multiple calls (with high probability)', () => {
      const results = Array.from({ length: 100 }, () => types.getRandomType());
      const uniqueIds = new Set(results.map(result => result.id));

      expect(uniqueIds.size).toBe(2);
      expect(uniqueIds.has('google-maps-reviews')).toBe(true);
      expect(uniqueIds.has('x-tweets')).toBe(true);
    });

    test('should always return a type that can be found by getTypeById', () => {
      const randomType = types.getRandomType();
      const foundType = types.getTypeById(randomType.id);

      expect(foundType).toBe(randomType);
    });
  });

  describe('integration tests', () => {
    test('should have consistent behavior between getRandomType and getTypeById', () => {
      const randomType = types.getRandomType();
      const typeById = types.getTypeById(randomType.id);

      expect(typeById).toBe(randomType);
      expect(typeById.id).toBe(randomType.id);
      expect(typeById.name).toBe(randomType.name);
    });

    test('should handle the complete GoogleMapsReviews type structure', () => {
      const type = types.getTypeById('google-maps-reviews');

      expect(type).toBeDefined();
      expect(type.id).toBe('google-maps-reviews');
      expect(type.name).toBe('Google Maps Reviews');

      // Verify all required functions exist and are callable
      expect(typeof type.createSyntheticTask).toBe('function');
      expect(typeof type.score).toBe('function');
      expect(typeof type.prepareAndSendForDigestion).toBe('function');

      // Verify the functions have the expected properties (allow for mocked function names)
      expect(type.createSyntheticTask.name).toMatch(/createSyntheticTask|mockConstructor/);
      expect(type.score.name).toMatch(/score|mockConstructor/);
      expect(type.prepareAndSendForDigestion.name).toMatch(/prepareAndSendForDigestion|mockConstructor/);
    });

    test('should handle the complete XTweets type structure', () => {
      const type = types.getTypeById('x-tweets');

      expect(type).toBeDefined();
      expect(type.id).toBe('x-tweets');
      expect(type.name).toBe('X Tweets');

      // Verify all required functions exist and are callable
      expect(typeof type.createSyntheticTask).toBe('function');
      expect(typeof type.score).toBe('function');
      expect(typeof type.prepareAndSendForDigestion).toBe('function');

      // Verify the functions have the expected properties (allow for mocked function names)
      expect(type.createSyntheticTask.name).toMatch(/createSyntheticTask|mockConstructor/);
      expect(type.score.name).toMatch(/score|mockConstructor/);
      expect(type.prepareAndSendForDigestion.name).toMatch(/prepareAndSendForDigestion|mockConstructor/);
    });
  });

  describe('edge cases and error handling', () => {
    test('should handle Math.random edge cases for getRandomType', () => {
      // Mock Math.random to return edge values
      const originalRandom = Math.random;

      // Test with 0 (should get first element - GoogleMapsReviews)
      Math.random = jest.fn().mockReturnValue(0);
      let result = types.getRandomType();
      expect(result).toBe(GoogleMapsReviews);

      // Test with close to 1 (should get last element - XTweets)
      Math.random = jest.fn().mockReturnValue(0.999_999);
      result = types.getRandomType();
      expect(result).toBe(XTweets);

      // Test with 0.5 (should get second element - XTweets)
      Math.random = jest.fn().mockReturnValue(0.5);
      result = types.getRandomType();
      expect(result).toBe(XTweets);

      // Restore original Math.random
      Math.random = originalRandom;
    });

    test('should return the same reference for identical lookups', () => {
      const type1 = types.getTypeById('google-maps-reviews');
      const type2 = types.getTypeById('google-maps-reviews');

      expect(type1).toBe(type2);
      expect(type1 === type2).toBe(true);
    });

    test('should return the same reference for XTweets identical lookups', () => {
      const type1 = types.getTypeById('x-tweets');
      const type2 = types.getTypeById('x-tweets');

      expect(type1).toBe(type2);
      expect(type1 === type2).toBe(true);
    });
  });
});
