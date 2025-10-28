import logger from '#modules/logger/index.js';
import validateMinerAgainstBatch from './validate-miner-against-batch.js';

jest.mock('#modules/logger/index.js', () => ({
  error: jest.fn(),
}));

describe('#utils/validator/types/x-tweets/score/validate-miner-against-batch.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return true when all tweets pass validation', () => {
    const tweets = [
      {
        tweetId: '1',
        username: 'user1',
        userId: '123',
        createdAt: '2024-01-01T12:00:00.000Z'
      },
      {
        tweetId: '2',
        username: 'user2',
        userId: '456',
        createdAt: '2024-01-02T12:00:00.000Z'
      }
    ];

    const keyword = '"test"';
    const minerUID = 'miner1';

    const verifiedTweetsMap = new Map([
      ['1', {
        id: '1',
        text: 'This is a test tweet',
        user: { username: 'user1', id: '123' },
        created_at: 'Mon Jan 01 12:00:00 +0000 2024'
      }],
      ['2', {
        id: '2',
        text: 'Another test tweet',
        user: { username: 'user2', id: '456' },
        created_at: 'Tue Jan 02 12:00:00 +0000 2024'
      }]
    ]);

    const result = validateMinerAgainstBatch(tweets, keyword, minerUID, verifiedTweetsMap);

    expect(result).toBe(true);
    expect(logger.error).not.toHaveBeenCalled();
  });

  test('should return false when tweet not found in verified map', () => {
    const tweets = [
      {
        tweetId: '1',
        username: 'user1',
        userId: '123',
        createdAt: '2024-01-01T12:00:00.000Z'
      }
    ];

    const keyword = '"test"';
    const minerUID = 'miner1';
    const verifiedTweetsMap = new Map(); // Empty map

    const result = validateMinerAgainstBatch(tweets, keyword, minerUID, verifiedTweetsMap);

    expect(result).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      'X Tweets - UID miner1: Spot check failed: No verified tweet found for tweetId 1'
    );
  });

  test('should return false when tweet ID does not match', () => {
    const tweets = [
      {
        tweetId: '1',
        username: 'user1',
        userId: '123',
        createdAt: '2024-01-01T12:00:00.000Z'
      }
    ];

    const keyword = '"test"';
    const minerUID = 'miner1';

    const verifiedTweetsMap = new Map([
      ['1', {
        id: '2', // Different ID
        text: 'This is a test tweet',
        user: { username: 'user1', id: '123' },
        created_at: 'Mon Jan 01 12:00:00 +0000 2024'
      }]
    ]);

    const result = validateMinerAgainstBatch(tweets, keyword, minerUID, verifiedTweetsMap);

    expect(result).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      'X Tweets - UID miner1: Spot check failed: ID mismatch for tweetId 1'
    );
  });

  test('should return false when keyword not found in verified tweet', () => {
    const tweets = [
      {
        tweetId: '1',
        username: 'user1',
        userId: '123',
        createdAt: '2024-01-01T12:00:00.000Z'
      }
    ];

    const keyword = '"bitcoin"';
    const minerUID = 'miner1';

    const verifiedTweetsMap = new Map([
      ['1', {
        id: '1',
        text: 'This is about ethereum', // No bitcoin keyword
        user: { username: 'user1', id: '123' },
        created_at: 'Mon Jan 01 12:00:00 +0000 2024'
      }]
    ]);

    const result = validateMinerAgainstBatch(tweets, keyword, minerUID, verifiedTweetsMap);

    expect(result).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      'X Tweets - UID miner1: Spot check failed: Keyword "bitcoin" not found in verified tweet 1'
    );
  });

  test('should find keyword in hashtags', () => {
    const tweets = [
      {
        tweetId: '1',
        username: 'user1',
        userId: '123',
        createdAt: '2024-01-01T12:00:00.000Z'
      }
    ];

    const keyword = '"bitcoin"';
    const minerUID = 'miner1';

    const verifiedTweetsMap = new Map([
      ['1', {
        id: '1',
        text: 'This is about crypto',
        entities: {
          hashtags: [
            { text: 'bitcoin' },
            { text: 'crypto' }
          ]
        },
        user: { username: 'user1', id: '123' },
        created_at: 'Mon Jan 01 12:00:00 +0000 2024'
      }]
    ]);

    const result = validateMinerAgainstBatch(tweets, keyword, minerUID, verifiedTweetsMap);

    expect(result).toBe(true);
  });

  test('should find keyword in username', () => {
    const tweets = [
      {
        tweetId: '1',
        username: 'bitcoin_enthusiast',
        userId: '123',
        createdAt: '2024-01-01T12:00:00.000Z'
      }
    ];

    const keyword = '"bitcoin"';
    const minerUID = 'miner1';

    const verifiedTweetsMap = new Map([
      ['1', {
        id: '1',
        text: 'This is about crypto',
        user: { username: 'bitcoin_enthusiast', id: '123' },
        created_at: 'Mon Jan 01 12:00:00 +0000 2024'
      }]
    ]);

    const result = validateMinerAgainstBatch(tweets, keyword, minerUID, verifiedTweetsMap);

    expect(result).toBe(true);
  });

  test('should return false when username does not match', () => {
    const tweets = [
      {
        tweetId: '1',
        username: 'user1',
        userId: '123',
        createdAt: '2024-01-01T12:00:00.000Z'
      }
    ];

    const keyword = '"test"';
    const minerUID = 'miner1';

    const verifiedTweetsMap = new Map([
      ['1', {
        id: '1',
        text: 'This is a test tweet',
        user: { username: 'user2', id: '123' }, // Different username
        created_at: 'Mon Jan 01 12:00:00 +0000 2024'
      }]
    ]);

    const result = validateMinerAgainstBatch(tweets, keyword, minerUID, verifiedTweetsMap);

    expect(result).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      'X Tweets - UID miner1: Spot check failed: Username mismatch for tweetId 1 - expected user1, got user2'
    );
  });

  test('should return false when user ID does not match', () => {
    const tweets = [
      {
        tweetId: '1',
        username: 'user1',
        userId: '123',
        createdAt: '2024-01-01T12:00:00.000Z'
      }
    ];

    const keyword = '"test"';
    const minerUID = 'miner1';

    const verifiedTweetsMap = new Map([
      ['1', {
        id: '1',
        text: 'This is a test tweet',
        user: { username: 'user1', id: '456' }, // Different user ID
        created_at: 'Mon Jan 01 12:00:00 +0000 2024'
      }]
    ]);

    const result = validateMinerAgainstBatch(tweets, keyword, minerUID, verifiedTweetsMap);

    expect(result).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      'X Tweets - UID miner1: Spot check failed: User ID mismatch for tweetId 1 - expected 123, got 456'
    );
  });

  test('should return false when dates do not match', () => {
    const tweets = [
      {
        tweetId: '1',
        username: 'user1',
        userId: '123',
        createdAt: '2024-01-01T12:00:00.000Z'
      }
    ];

    const keyword = '"test"';
    const minerUID = 'miner1';

    const verifiedTweetsMap = new Map([
      ['1', {
        id: '1',
        text: 'This is a test tweet',
        user: { username: 'user1', id: '123' },
        created_at: 'Mon Jan 02 12:00:00 +0000 2024' // Different date
      }]
    ]);

    const result = validateMinerAgainstBatch(tweets, keyword, minerUID, verifiedTweetsMap);

    expect(result).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      'X Tweets - UID miner1: Spot check failed: Date mismatch for tweetId 1 - expected 2024-01-01T12:00:00.000Z, got 2024-01-02T12:00:00.000Z'
    );
  });

  test('should ignore milliseconds in date comparison', () => {
    const tweets = [
      {
        tweetId: '1',
        username: 'user1',
        userId: '123',
        createdAt: '2024-01-01T12:00:00.123Z' // With milliseconds
      }
    ];

    const keyword = '"test"';
    const minerUID = 'miner1';

    const verifiedTweetsMap = new Map([
      ['1', {
        id: '1',
        text: 'This is a test tweet',
        user: { username: 'user1', id: '123' },
        created_at: 'Mon Jan 01 12:00:00 +0000 2024' // Without milliseconds
      }]
    ]);

    const result = validateMinerAgainstBatch(tweets, keyword, minerUID, verifiedTweetsMap);

    expect(result).toBe(true);
  });

  test('should handle empty tweets array', () => {
    const tweets = [];
    const keyword = '"test"';
    const minerUID = 'miner1';
    const verifiedTweetsMap = new Map();

    const result = validateMinerAgainstBatch(tweets, keyword, minerUID, verifiedTweetsMap);

    expect(result).toBe(true);
    expect(logger.error).not.toHaveBeenCalled();
  });

  test('should strip quotes from keyword for validation', () => {
    const tweets = [
      {
        tweetId: '1',
        username: 'user1',
        userId: '123',
        createdAt: '2024-01-01T12:00:00.000Z'
      }
    ];

    const keyword = '"test"'; // With quotes
    const minerUID = 'miner1';

    const verifiedTweetsMap = new Map([
      ['1', {
        id: '1',
        text: 'This is a test tweet', // Contains "test" without quotes
        user: { username: 'user1', id: '123' },
        created_at: 'Mon Jan 01 12:00:00 +0000 2024'
      }]
    ]);

    const result = validateMinerAgainstBatch(tweets, keyword, minerUID, verifiedTweetsMap);

    expect(result).toBe(true);
  });

  test('should handle case insensitive keyword matching', () => {
    const tweets = [
      {
        tweetId: '1',
        username: 'user1',
        userId: '123',
        createdAt: '2024-01-01T12:00:00.000Z'
      }
    ];

    const keyword = '"TEST"'; // Uppercase
    const minerUID = 'miner1';

    const verifiedTweetsMap = new Map([
      ['1', {
        id: '1',
        text: 'This is a test tweet', // Lowercase
        user: { username: 'user1', id: '123' },
        created_at: 'Mon Jan 01 12:00:00 +0000 2024'
      }]
    ]);

    const result = validateMinerAgainstBatch(tweets, keyword, minerUID, verifiedTweetsMap);

    expect(result).toBe(true);
  });
});
