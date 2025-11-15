import config from '#config';
import logger from '#modules/logger/index.js';
import time from '#modules/time/index.js';
import random from '#modules/random/index.js';
import createSyntheticTask from './index.js';
import { generateKeywordsFromChutes, generateKeywordsFromOpenRouter } from './generate-keywords.js';

jest.mock('#config');
jest.mock('#modules/logger/index.js', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));
jest.mock('#modules/time/index.js', () => ({
  getDuration: jest.fn(),
}));
jest.mock('#modules/random/index.js', () => ({
  fromArray: jest.fn(),
}));
jest.mock('./generate-keywords.js', () => ({
  generateKeywordsFromChutes: jest.fn(),
  generateKeywordsFromOpenRouter: jest.fn(),
}));

describe('utils/validator/types/x-tweets/create-synthetic/index.js', () => {
  const originalEnvironment = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnvironment };
    Math.random = jest.fn().mockReturnValue(0);

    // Mock config
    config.VALIDATOR = {
      X_TWEETS: {
        CHUTES_API_URL: 'https://api.chutes.com/v1/chat/completions',
        CHUTES_MODELS: ['gpt-4'],
        TWEETS_SYNAPSE_PARAMS: {
          timeout: 120
        }
      }
    };

    // Mock time.getDuration to return a fixed value
    time.getDuration.mockReturnValue(1.5);
  });

  afterEach(() => {
    process.env = originalEnvironment;
  });

  test('should create synthetic task successfully with Chutes API (default)', async () => {
    const mockKeywords = ['bitcoin', 'ethereum', 'crypto', 'blockchain', 'defi'];
    const mockSelectedKeyword = 'bitcoin';

    process.env.CHUTES_API_TOKEN = 'test-token';
    delete process.env.X_USE_OPENROUTER_TO_CREATE_SYNTHETIC;

    generateKeywordsFromChutes.mockResolvedValue(mockKeywords);
    random.fromArray.mockReturnValue(mockSelectedKeyword);

    const result = await createSyntheticTask();

    expect(generateKeywordsFromChutes).toHaveBeenCalledTimes(1);
    expect(generateKeywordsFromOpenRouter).not.toHaveBeenCalled();
    expect(random.fromArray).toHaveBeenCalledWith(mockKeywords);
    expect(logger.info).toHaveBeenCalledWith('X Tweets - Creating synthetic task');
    expect(logger.info).toHaveBeenCalledWith('X Tweets - Calling Chutes API to generate keywords');
    expect(logger.info).toHaveBeenCalledWith(`X Tweets - Generated ${mockKeywords.length} keywords from Chutes API`);
    expect(logger.info).toHaveBeenCalledWith(`X Tweets - Selected keyword: "${mockSelectedKeyword}" (took 1.50s)`);

    expect(result).toEqual({
      metadata: {
        keyword: `"${mockSelectedKeyword}"`
      },
      timeout: 120
    });
  });

  test('should create synthetic task successfully with OpenRouter API', async () => {
    const mockKeywords = ['quantum', 'photosynthesis', 'fjord'];
    const mockSelectedKeyword = 'quantum';

    process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
    process.env.X_USE_OPENROUTER_TO_CREATE_SYNTHETIC = 'true';

    generateKeywordsFromOpenRouter.mockResolvedValue(mockKeywords);
    random.fromArray.mockReturnValue(mockSelectedKeyword);

    const result = await createSyntheticTask();

    expect(generateKeywordsFromOpenRouter).toHaveBeenCalledTimes(1);
    expect(generateKeywordsFromChutes).not.toHaveBeenCalled();
    expect(random.fromArray).toHaveBeenCalledWith(mockKeywords);
    expect(logger.info).toHaveBeenCalledWith('X Tweets - Creating synthetic task');
    expect(logger.info).toHaveBeenCalledWith('X Tweets - Calling OpenRouter API to generate keywords');
    expect(logger.info).toHaveBeenCalledWith(`X Tweets - Generated ${mockKeywords.length} keywords from OpenRouter API`);
    expect(logger.info).toHaveBeenCalledWith(`X Tweets - Selected keyword: "${mockSelectedKeyword}" (took 1.50s)`);

    expect(result).toEqual({
      metadata: {
        keyword: `"${mockSelectedKeyword}"`
      },
      timeout: 120
    });
  });

  test('should throw error when CHUTES_API_TOKEN is not configured (default mode)', async () => {
    delete process.env.CHUTES_API_TOKEN;
    delete process.env.X_USE_OPENROUTER_TO_CREATE_SYNTHETIC;

    await expect(createSyntheticTask()).rejects.toThrow('CHUTES_API_TOKEN not configured');
    expect(logger.error).toHaveBeenCalledWith(
      'X Tweets - Error creating synthetic task (took 1.50s):',
      expect.any(Error)
    );
    expect(generateKeywordsFromChutes).not.toHaveBeenCalled();
  });

  test('should throw error when OPENROUTER_API_KEY is not configured', async () => {
    delete process.env.OPENROUTER_API_KEY;
    process.env.X_USE_OPENROUTER_TO_CREATE_SYNTHETIC = 'true';

    await expect(createSyntheticTask()).rejects.toThrow('OPENROUTER_API_KEY not configured');
    expect(logger.error).toHaveBeenCalledWith(
      'X Tweets - Error creating synthetic task (took 1.50s):',
      expect.any(Error)
    );
    expect(generateKeywordsFromOpenRouter).not.toHaveBeenCalled();
  });

  test('should handle Chutes API call failure', async () => {
    process.env.CHUTES_API_TOKEN = 'test-token';
    delete process.env.X_USE_OPENROUTER_TO_CREATE_SYNTHETIC;

    generateKeywordsFromChutes.mockRejectedValue(new Error('Chutes API error: 500 Internal Server Error'));

    await expect(createSyntheticTask()).rejects.toThrow('Chutes API error: 500 Internal Server Error');
    expect(logger.error).toHaveBeenCalledWith(
      'X Tweets - Error creating synthetic task (took 1.50s):',
      expect.any(Error)
    );
  });

  test('should handle OpenRouter API call failure', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.X_USE_OPENROUTER_TO_CREATE_SYNTHETIC = 'true';

    generateKeywordsFromOpenRouter.mockRejectedValue(new Error('OpenRouter API error: 500 Internal Server Error'));

    await expect(createSyntheticTask()).rejects.toThrow('OpenRouter API error: 500 Internal Server Error');
    expect(logger.error).toHaveBeenCalledWith(
      'X Tweets - Error creating synthetic task (took 1.50s):',
      expect.any(Error)
    );
  });
});
