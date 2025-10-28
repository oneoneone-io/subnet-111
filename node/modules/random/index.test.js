import random from './index.js';

describe('modules/random', () => {
  describe('.fromArray()', () => {
    test('should return a random element from the array', () => {
      const result = random.fromArray(['a', 'b', 'c']);

      expect(['a', 'b', 'c']).toContain(result);
    });
  });

  describe('.between()', () => {

    test('should return a random number between the min and max', () => {
      const result = random.between(1, 10);

      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(10);
    });
  });

  describe('.shuffle()', () => {
    test('should return shuffled array with specified count', () => {
      const result = random.shuffle([1, 2, 3, 4, 5], 3);

      expect(result).toHaveLength(3);
      expect([1, 2, 3, 4, 5]).toEqual(expect.arrayContaining(result));
    });

    test('should return full array when count is not provided', () => {
      const result = random.shuffle([1, 2, 3, 4, 5]);

      expect(result).toHaveLength(5);
      expect([1, 2, 3, 4, 5]).toEqual(expect.arrayContaining(result));
    });
  });
});
