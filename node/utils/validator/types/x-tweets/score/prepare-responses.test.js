import logger from '#modules/logger/index.js';
import config from '#config';
import { prepareValidationResults } from '#utils/validator/validation-result.js';
import array from '#modules/array/index.js';
import random from '#modules/random/index.js';
import { prepareResponses, getTweetsForSpotCheck, checkKeywordPresence } from './prepare-responses.js';

jest.mock('#modules/logger/index.js', () => ({
  info: jest.fn(),
}));
jest.mock('#config');
jest.mock('#utils/validator/validation-result.js', () => ({
  prepareValidationResults: jest.fn(),
}));
jest.mock('#modules/array/index.js');
jest.mock('#modules/random/index.js');

describe('#utils/validator/types/x-tweets/score/prepare-responses.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock config
    config.VALIDATOR = {
      X_TWEETS: {
        SPOT_CHECK_COUNT: 3
      }
    };
  });

  describe('checkKeywordPresence', () => {
    test('should find keyword in tweet text', () => {
      const tweet = { text: 'This is a test tweet about bitcoin' };
      const keyword = 'bitcoin';

      expect(checkKeywordPresence(tweet, keyword)).toBe(true);
    });

    test('should find keyword in hashtags', () => {
      const tweet = { hashtags: ['crypto', 'bitcoin', 'blockchain'] };
      const keyword = 'bitcoin';

      expect(checkKeywordPresence(tweet, keyword)).toBe(true);
    });

    test('should find keyword in username', () => {
      const tweet = { username: 'bitcoin_enthusiast' };
      const keyword = 'bitcoin';

      expect(checkKeywordPresence(tweet, keyword)).toBe(true);
    });

    test('should be case insensitive', () => {
      const tweet = { text: 'This is about BITCOIN' };
      const keyword = 'bitcoin';

      expect(checkKeywordPresence(tweet, keyword)).toBe(true);
    });

    test('should return false when keyword not found', () => {
      const tweet = { text: 'This is about ethereum', hashtags: ['crypto'], username: 'eth_user' };
      const keyword = 'bitcoin';

      expect(checkKeywordPresence(tweet, keyword)).toBe(false);
    });

    test('should handle null/undefined values', () => {
      const tweet = { text: null, hashtags: undefined, username: null };
      const keyword = 'bitcoin';

      expect(checkKeywordPresence(tweet, keyword)).toBe(false);
    });

    test('should handle empty hashtags array', () => {
      const tweet = { text: 'test', hashtags: [] };
      const keyword = 'bitcoin';

      expect(checkKeywordPresence(tweet, keyword)).toBe(false);
    });
  });

  describe('getTweetsForSpotCheck', () => {
    test('should return empty result for no tweets', () => {
      const result = getTweetsForSpotCheck([], 'miner1');

      expect(result).toEqual({
        mostRecentDate: undefined,
        selectedTweets: []
      });
    });

    test('should return empty result for null tweets', () => {
      const result = getTweetsForSpotCheck(null, 'miner1');

      expect(result).toEqual({
        mostRecentDate: undefined,
        selectedTweets: []
      });
    });

    test('should return empty result when spot check count is 0', () => {
      config.VALIDATOR.X_TWEETS.SPOT_CHECK_COUNT = 0;

      const tweets = [
        { tweetId: '1', createdAt: '2024-01-01' },
        { tweetId: '2', createdAt: '2024-01-02' }
      ];

      const result = getTweetsForSpotCheck(tweets, 'miner1');

      expect(result).toEqual({
        mostRecentDate: undefined,
        selectedTweets: []
      });
    });

    test('should select only most recent tweet when spot check count is 1', () => {
      config.VALIDATOR.X_TWEETS.SPOT_CHECK_COUNT = 1;

      const tweets = [
        { tweetId: '1', createdAt: '2024-01-01' },
        { tweetId: '2', createdAt: '2024-01-02' },
        { tweetId: '3', createdAt: '2024-01-03' }
      ];

      const result = getTweetsForSpotCheck(tweets, 'miner1');

      expect(result.selectedTweets).toHaveLength(1);
      expect(result.selectedTweets[0].tweetId).toBe('3');
      expect(result.mostRecentDate).toEqual(new Date('2024-01-03'));
      expect(logger.info).toHaveBeenCalledWith(
        'X Tweets - UID miner1: Selected most recent tweet 3 - (2024-01-03) for spot check'
      );
    });

    test('should select most recent and random tweets', () => {
      config.VALIDATOR.X_TWEETS.SPOT_CHECK_COUNT = 3;

      const tweets = [
        { tweetId: '1', createdAt: '2024-01-01' },
        { tweetId: '2', createdAt: '2024-01-02' },
        { tweetId: '3', createdAt: '2024-01-03' },
        { tweetId: '4', createdAt: '2024-01-04' }
      ];

      const remainingTweets = [
        { tweetId: '1', createdAt: '2024-01-01' },
        { tweetId: '2', createdAt: '2024-01-02' },
        { tweetId: '3', createdAt: '2024-01-03' }
      ];

      const randomTweets = [
        { tweetId: '2', createdAt: '2024-01-02' },
        { tweetId: '1', createdAt: '2024-01-01' }
      ];

      random.shuffle.mockReturnValue(randomTweets);

      const result = getTweetsForSpotCheck(tweets, 'miner1');

      expect(result.selectedTweets).toHaveLength(3);
      expect(result.selectedTweets[0].tweetId).toBe('4'); // Most recent
      expect(result.mostRecentDate).toEqual(new Date('2024-01-04'));
      expect(random.shuffle).toHaveBeenCalledWith(remainingTweets, 2);
      expect(logger.info).toHaveBeenCalledWith(
        'X Tweets - UID miner1: Selected most recent tweet 4 - (2024-01-04) for spot check'
      );
      expect(logger.info).toHaveBeenCalledWith(
        'X Tweets - UID miner1: Selected random tweet 2 - (2024-01-02) for spot check'
      );
      expect(logger.info).toHaveBeenCalledWith(
        'X Tweets - UID miner1: Selected random tweet 1 - (2024-01-01) for spot check'
      );
    });

    test('should handle tweets with same date', () => {
      config.VALIDATOR.X_TWEETS.SPOT_CHECK_COUNT = 2;

      const tweets = [
        { tweetId: '1', createdAt: '2024-01-01' },
        { tweetId: '2', createdAt: '2024-01-01' },
        { tweetId: '3', createdAt: '2024-01-01' }
      ];

      random.shuffle.mockReturnValue([{ tweetId: '2', createdAt: '2024-01-01' }]);

      const result = getTweetsForSpotCheck(tweets, 'miner1');

      expect(result.selectedTweets).toHaveLength(2);
      expect(result.mostRecentDate).toEqual(new Date('2024-01-01'));
    });
  });

  describe('prepareResponses', () => {
    test('should process valid responses successfully', () => {
      const responses = [
        [
          { tweetId: '1', text: 'test tweet', username: 'user1', userId: '1', displayName: 'User 1', followersCount: 100, followingCount: 50, verified: false, createdAt: '2024-01-01', tweetUrl: 'https://twitter.com/1', hashtags: [] }
        ]
      ];

      const minerUIDs = ['miner1'];
      const responseTimes = [1000];
      const synapseTimeout = 120;
      const metadata = { keyword: '"test"' };
      const typeId = 'x-tweets';

      const mockValidationResults = [
        {
          minerUID: 'miner1',
          validationError: null,
          passedValidation: false,
          count: 0,
          mostRecentDate: undefined,
          data: []
        }
      ];

      prepareValidationResults.mockReturnValue(mockValidationResults);
      array.uniqueBy.mockReturnValue([
        { tweetId: '1', text: 'test tweet', username: 'user1', userId: '1', displayName: 'User 1', followersCount: 100, followingCount: 50, verified: false, createdAt: '2024-01-01', tweetUrl: 'https://twitter.com/1', hashtags: [] }
      ]);
      array.validateArray.mockReturnValue({
        valid: [
          { tweetId: '1', text: 'test tweet', username: 'user1', userId: '1', displayName: 'User 1', followersCount: 100, followingCount: 50, verified: false, createdAt: '2024-01-01', tweetUrl: 'https://twitter.com/1', hashtags: [] }
        ],
        invalid: []
      });

      random.shuffle.mockReturnValue([]);

      const result = prepareResponses(responses, minerUIDs, responseTimes, synapseTimeout, metadata, typeId);

      expect(prepareValidationResults).toHaveBeenCalledWith(responses, minerUIDs, responseTimes, metadata, typeId);
      expect(array.uniqueBy).toHaveBeenCalledWith(responses[0], 'tweetId');
      expect(logger.info).toHaveBeenCalledWith(
        'X Tweets - UID miner1: Data cleaning - 1 tweets -> 1 unique tweets'
      );
      expect(logger.info).toHaveBeenCalledWith(
        'X Tweets - UID miner1: Structural validation passed - 1 tweets validated successfully'
      );
      expect(logger.info).toHaveBeenCalledWith(
        'X Tweets - UID miner1: Keyword validation passed - 1/1 tweets contain keyword "test"'
      );

      expect(result[0].passedValidation).toBe(true);
      expect(result[0].count).toBe(1);
      expect(result[0].data).toHaveLength(1);
    });

    test('should skip responses with validation errors', () => {
      const responses = [
        [{ tweetId: '1', text: 'test' }]
      ];

      const mockValidationResults = [
        {
          minerUID: 'miner1',
          validationError: 'Invalid response format',
          passedValidation: false,
          count: 0,
          mostRecentDate: undefined,
          data: []
        }
      ];

      prepareValidationResults.mockReturnValue(mockValidationResults);

      const result = prepareResponses(responses, ['miner1'], [1000], 120, { keyword: '"test"' }, 'x-tweets');

      expect(array.uniqueBy).not.toHaveBeenCalled();
      expect(result[0].validationError).toBe('Invalid response format');
    });

    test('should handle structural validation failures', () => {
      const responses = [
        [{ tweetId: '1', text: 'test' }] // Missing required fields
      ];

      const mockValidationResults = [
        {
          minerUID: 'miner1',
          validationError: null,
          passedValidation: false,
          count: 0,
          mostRecentDate: undefined,
          data: []
        }
      ];

      prepareValidationResults.mockReturnValue(mockValidationResults);
      array.uniqueBy.mockReturnValue([{ tweetId: '1', text: 'test' }]);
      array.validateArray.mockReturnValue({
        valid: [],
        invalid: [{ tweetId: '1', text: 'test' }]
      });

      const result = prepareResponses(responses, ['miner1'], [1000], 120, { keyword: '"test"' }, 'x-tweets');

      expect(result[0].validationError).toBe('Structural validation failed on tweet objects');
    });

    test('should handle keyword validation failures', () => {
      const responses = [
        [
          { tweetId: '1', text: 'no keyword here', username: 'user1', userId: '1', displayName: 'User 1', followersCount: 100, followingCount: 50, verified: false, createdAt: '2024-01-01', tweetUrl: 'https://twitter.com/1', hashtags: [] }
        ]
      ];

      const mockValidationResults = [
        {
          minerUID: 'miner1',
          validationError: null,
          passedValidation: false,
          count: 0,
          mostRecentDate: undefined,
          data: []
        }
      ];

      prepareValidationResults.mockReturnValue(mockValidationResults);
      array.uniqueBy.mockReturnValue([
        { tweetId: '1', text: 'no keyword here', username: 'user1', userId: '1', displayName: 'User 1', followersCount: 100, followingCount: 50, verified: false, createdAt: '2024-01-01', tweetUrl: 'https://twitter.com/1', hashtags: [] }
      ]);
      array.validateArray.mockReturnValue({
        valid: [
          { tweetId: '1', text: 'no keyword here', username: 'user1', userId: '1', displayName: 'User 1', followersCount: 100, followingCount: 50, verified: false, createdAt: '2024-01-01', tweetUrl: 'https://twitter.com/1', hashtags: [] }
        ],
        invalid: []
      });

      const result = prepareResponses(responses, ['miner1'], [1000], 120, { keyword: '"bitcoin"' }, 'x-tweets');

      expect(result[0].validationError).toBe('No tweets contain the required keyword');
    });

    test('should strip quotes from keyword for validation', () => {
      const responses = [
        [
          { tweetId: '1', text: 'test keyword here', username: 'user1', userId: '1', displayName: 'User 1', followersCount: 100, followingCount: 50, verified: false, createdAt: '2024-01-01', tweetUrl: 'https://twitter.com/1', hashtags: [] }
        ]
      ];

      const mockValidationResults = [
        {
          minerUID: 'miner1',
          validationError: null,
          passedValidation: false,
          count: 0,
          mostRecentDate: undefined,
          data: []
        }
      ];

      prepareValidationResults.mockReturnValue(mockValidationResults);
      array.uniqueBy.mockReturnValue([
        { tweetId: '1', text: 'test keyword here', username: 'user1', userId: '1', displayName: 'User 1', followersCount: 100, followingCount: 50, verified: false, createdAt: '2024-01-01', tweetUrl: 'https://twitter.com/1', hashtags: [] }
      ]);
      array.validateArray.mockReturnValue({
        valid: [
          { tweetId: '1', text: 'test keyword here', username: 'user1', userId: '1', displayName: 'User 1', followersCount: 100, followingCount: 50, verified: false, createdAt: '2024-01-01', tweetUrl: 'https://twitter.com/1', hashtags: [] }
        ],
        invalid: []
      });

      random.shuffle.mockReturnValue([]);

      const result = prepareResponses(responses, ['miner1'], [1000], 120, { keyword: '"test"' }, 'x-tweets');

      expect(result[0].passedValidation).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(
        'X Tweets - UID miner1: Keyword validation passed - 1/1 tweets contain keyword "test"'
      );
    });
  });
});
