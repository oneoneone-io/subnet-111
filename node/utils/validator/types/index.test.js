import types from './index.js';
import GoogleMapsReviews from './google-maps-reviews/index.js';
import XTweets from './x-tweets/index.js';
import random from '#modules/random/index.js';
import logger from '#modules/logger/index.js';

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

jest.mock('#modules/random/index.js', () => ({
  fromArray: jest.fn(),
}));

jest.mock('#modules/logger/index.js', () => ({
  info: jest.fn(),
  warning: jest.fn(),
}));

describe('utils/validator/types/index.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('.getTypeById()', () => {
    test('should return undefined for any id (TYPES elements do not have .id property)', () => {
      expect(types.getTypeById('google-maps-reviews')).toBeUndefined();
      expect(types.getTypeById('x-tweets')).toBeUndefined();
      expect(types.getTypeById('invalid')).toBeUndefined();
    });
  });

  describe('.getRandomType()', () => {
    test('should return GoogleMapsReviews when selected', () => {
      random.fromArray.mockReturnValue({ func: GoogleMapsReviews, weight: 25 });

      const result = types.getRandomType();

      expect(result).toBe(GoogleMapsReviews);
      expect(random.fromArray).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Type selection: Google Maps Reviews (weights: 25)');
    });

    test('should return XTweets when selected', () => {
      random.fromArray.mockReturnValue({ func: XTweets, weight: 75 });

      const result = types.getRandomType();

      expect(result).toBe(XTweets);
      expect(random.fromArray).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Type selection: X Tweets (weights: 75)');
    });

    test('should build weighted array with 100 total items (25 + 75)', () => {
      random.fromArray.mockReturnValue({ func: XTweets, weight: 75 });

      types.getRandomType();

      const weightedArray = random.fromArray.mock.calls[0][0];
      expect(weightedArray).toHaveLength(100);

      // Count occurrences
      const googleMapsCount = weightedArray.filter(t => t.func === GoogleMapsReviews).length;
      const xTweetsCount = weightedArray.filter(t => t.func === XTweets).length;

      expect(googleMapsCount).toBe(25);
      expect(xTweetsCount).toBe(75);
    });
  });
});
