import xTweetsValidatorType from './index.js';

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

describe('utils/validator/types/x-tweets/index.js', () => {
  test('should export the correct validator type structure', () => {
    expect(xTweetsValidatorType).toEqual({
      id: 'x-tweets',
      name: 'X Tweets',
      s3: {
        idField: 'tweetId',
        stripFields: ['tweetId', 'tweetUrl', 'userId'],
        getS3Identifier: expect.any(Function),
      },
      scoreConstants: {
        SPEED: 0.1,
        VOLUME: 0.7,
        RECENCY: 0.2,
      },
      createSyntheticTask: expect.any(Function),
      score: expect.any(Function),
      prepareAndSendForDigestion: expect.any(Function)
    });
  });

  test('should have the correct id', () => {
    expect(xTweetsValidatorType.id).toBe('x-tweets');
  });

  test('should have the correct name', () => {
    expect(xTweetsValidatorType.name).toBe('X Tweets');
  });

  test('should have the correct s3 structure', () => {
    expect(xTweetsValidatorType.s3).toEqual({
      idField: 'tweetId',
      stripFields: ['tweetId', 'tweetUrl', 'userId'],
      getS3Identifier: expect.any(Function),
    });
  });
  test('should export createSyntheticTask function', () => {
    expect(typeof xTweetsValidatorType.createSyntheticTask).toBe('function');
  });

  test('should export score function', () => {
    expect(typeof xTweetsValidatorType.score).toBe('function');
  });

  test('should export prepareAndSendForDigestion function', () => {
    expect(typeof xTweetsValidatorType.prepareAndSendForDigestion).toBe('function');
  });
});
