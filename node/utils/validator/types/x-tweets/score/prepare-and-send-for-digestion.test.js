import sendForDigestion from '#utils/validator/send-for-digestion.js';
import array from '#modules/array/index.js';
import logger from '#modules/logger/index.js';
import prepareAndSendForDigestion from './prepare-and-send-for-digestion.js';

jest.mock('#utils/validator/send-for-digestion.js');
jest.mock('#modules/array/index.js');
jest.mock('#modules/logger/index.js', () => ({
  info: jest.fn(),
}));

describe('#utils/validator/types/x-tweets/score/prepare-and-send-for-digestion.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should process responses and send for digestion successfully', async () => {
    const responses = [
      [
        { tweetId: '1', text: 'Tweet 1', username: 'user1' },
        { tweetId: '2', text: 'Tweet 2', username: 'user2' },
        { tweetId: '1', text: 'Tweet 1 duplicate', username: 'user1' } // Duplicate
      ],
      [
        { tweetId: '3', text: 'Tweet 3', username: 'user3' }
      ]
    ];

    const minerUIDs = ['miner1', 'miner2'];
    const metadata = { keyword: '"test"' };

    const uniqueTweets1 = [
      { tweetId: '1', text: 'Tweet 1', username: 'user1' },
      { tweetId: '2', text: 'Tweet 2', username: 'user2' }
    ];

    const uniqueTweets2 = [
      { tweetId: '3', text: 'Tweet 3', username: 'user3' }
    ];

    const validTweets1 = [
      { tweetId: '1', text: 'Tweet 1', username: 'user1', userId: '1', displayName: 'User 1', followersCount: 100, followingCount: 50, verified: false, createdAt: '2024-01-01', tweetUrl: 'https://twitter.com/1', hashtags: [] },
      { tweetId: '2', text: 'Tweet 2', username: 'user2', userId: '2', displayName: 'User 2', followersCount: 200, followingCount: 100, verified: true, createdAt: '2024-01-02', tweetUrl: 'https://twitter.com/2', hashtags: [] }
    ];

    const validTweets2 = [
      { tweetId: '3', text: 'Tweet 3', username: 'user3', userId: '3', displayName: 'User 3', followersCount: 300, followingCount: 150, verified: false, createdAt: '2024-01-03', tweetUrl: 'https://twitter.com/3', hashtags: [] }
    ];

    // Mock array functions
    array.uniqueBy
      .mockReturnValueOnce(uniqueTweets1)
      .mockReturnValueOnce(uniqueTweets2);

    array.validateArray
      .mockReturnValueOnce({ valid: validTweets1, invalid: [] })
      .mockReturnValueOnce({ valid: validTweets2, invalid: [] });

    // Mock sendForDigestion
    sendForDigestion
      .mockResolvedValueOnce({ status: 200 })
      .mockResolvedValueOnce({ status: 200 });

    await prepareAndSendForDigestion(responses, minerUIDs, metadata);

    // Verify data cleaning
    expect(array.uniqueBy).toHaveBeenCalledWith(responses[0], 'tweetId');
    expect(array.uniqueBy).toHaveBeenCalledWith(responses[1], 'tweetId');
    expect(logger.info).toHaveBeenCalledWith(
      'X Tweets - UID miner1: Data cleaning - 3 tweets -> 2 unique tweets'
    );
    expect(logger.info).toHaveBeenCalledWith(
      'X Tweets - UID miner2: Data cleaning - 1 tweets -> 1 unique tweets'
    );

    // Verify structural validation
    const expectedRequiredFields = [
      { name: 'tweetId', type: 'string' },
      { name: 'username', type: 'string' },
      { name: 'text', type: 'string' },
      { name: 'createdAt', type: 'string' },
      { name: 'tweetUrl', type: 'string' },
      { name: 'hashtags', type: 'object' },
      { name: 'userId', type: 'string' },
      { name: 'displayName', type: 'string' },
      { name: 'followersCount', type: 'number' },
      { name: 'followingCount', type: 'number' },
      { name: 'verified', type: 'boolean' }
    ];

    expect(array.validateArray).toHaveBeenCalledWith(uniqueTweets1, expectedRequiredFields);
    expect(array.validateArray).toHaveBeenCalledWith(uniqueTweets2, expectedRequiredFields);

    // Verify send for digestion
    expect(sendForDigestion).toHaveBeenCalledWith('x-tweets', 'miner1', validTweets1, metadata);
    expect(sendForDigestion).toHaveBeenCalledWith('x-tweets', 'miner2', validTweets2, metadata);

    // Verify success logging
    expect(logger.info).toHaveBeenCalledWith('X Tweets - UID miner1: Sent for digestion successfully');
    expect(logger.info).toHaveBeenCalledWith('X Tweets - UID miner2: Sent for digestion successfully');
  });

  test('should handle minerUIDs array shorter than responses', async () => {
    const responses = [
      [{ tweetId: '1', text: 'Tweet 1' }],
      [{ tweetId: '2', text: 'Tweet 2' }]
    ];

    const minerUIDs = ['miner1']; // Shorter than responses
    const metadata = { keyword: '"test"' };

    array.uniqueBy.mockReturnValue([{ tweetId: '1', text: 'Tweet 1' }]);
    array.validateArray.mockReturnValue({ valid: [], invalid: [] });
    sendForDigestion.mockResolvedValue({ status: 200 });

    await prepareAndSendForDigestion(responses, minerUIDs, metadata);

    // Should use index as minerUID for second response
    expect(sendForDigestion).toHaveBeenCalledWith('x-tweets', 'miner1', [], metadata);
    expect(sendForDigestion).toHaveBeenCalledWith('x-tweets', 1, [], metadata);
  });

  test('should handle empty responses array', async () => {
    const responses = [];
    const minerUIDs = [];
    const metadata = { keyword: '"test"' };

    await prepareAndSendForDigestion(responses, minerUIDs, metadata);

    expect(array.uniqueBy).not.toHaveBeenCalled();
    expect(array.validateArray).not.toHaveBeenCalled();
    expect(sendForDigestion).not.toHaveBeenCalled();
  });

  test('should handle sendForDigestion failure', async () => {
    const responses = [
      [{ tweetId: '1', text: 'Tweet 1' }]
    ];

    const minerUIDs = ['miner1'];
    const metadata = { keyword: '"test"' };

    array.uniqueBy.mockReturnValue([{ tweetId: '1', text: 'Tweet 1' }]);
    array.validateArray.mockReturnValue({ valid: [], invalid: [] });
    sendForDigestion.mockResolvedValue({ status: 500 }); // Non-200 status

    await prepareAndSendForDigestion(responses, minerUIDs, metadata);

    expect(sendForDigestion).toHaveBeenCalledWith('x-tweets', 'miner1', [], metadata);
    // Should not log success message for non-200 status
    expect(logger.info).not.toHaveBeenCalledWith('X Tweets - UID miner1: Sent for digestion successfully');
  });

  test('should handle sendForDigestion throwing error', async () => {
    const responses = [
      [{ tweetId: '1', text: 'Tweet 1' }]
    ];

    const minerUIDs = ['miner1'];
    const metadata = { keyword: '"test"' };

    array.uniqueBy.mockReturnValue([{ tweetId: '1', text: 'Tweet 1' }]);
    array.validateArray.mockReturnValue({ valid: [], invalid: [] });
    sendForDigestion.mockRejectedValue(new Error('Network error'));

    // Should throw error since there's no try-catch in the implementation
    await expect(prepareAndSendForDigestion(responses, minerUIDs, metadata)).rejects.toThrow('Network error');
  });
});
