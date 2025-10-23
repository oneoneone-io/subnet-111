import config from '#config';
import logger from '#modules/logger/index.js';
import time from '#modules/time/index.js';
import random from '#modules/random/index.js';
import retryFetch from '#modules/retry-fetch/index.js';
import createSyntheticTask from './index.js';

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
jest.mock('#modules/retry-fetch/index.js');

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

  test('should create synthetic task successfully', async () => {
    const mockKeywords = ['bitcoin', 'ethereum', 'crypto', 'blockchain', 'defi'];
    const mockSelectedKeyword = 'bitcoin';
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockKeywords)
          }
        }]
      })
    };

    process.env.CHUTES_API_TOKEN = 'test-token';
    retryFetch.mockResolvedValue(mockResponse);
    random.fromArray.mockReturnValue(mockSelectedKeyword);

    const result = await createSyntheticTask();

    expect(retryFetch).toHaveBeenCalledWith(
      'https://api.chutes.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json'
        },
        body: expect.stringContaining('Generate a list of 50 real, diverse, and unpredictable keywords')
      })
    );

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

  test('should handle markdown code blocks in response', async () => {
    const mockKeywords = ['test', 'keyword'];
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        choices: [{
          message: {
            content: '```json\n' + JSON.stringify(mockKeywords) + '\n```'
          }
        }]
      })
    };

    process.env.CHUTES_API_TOKEN = 'test-token';
    retryFetch.mockResolvedValue(mockResponse);
    random.fromArray.mockReturnValue('test');

    const result = await createSyntheticTask();

    expect(result.metadata.keyword).toBe('"test"');
  });

  test('should handle code blocks without json marker', async () => {
    const mockKeywords = ['test', 'keyword'];
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        choices: [{
          message: {
            content: '```\n' + JSON.stringify(mockKeywords) + '\n```'
          }
        }]
      })
    };

    process.env.CHUTES_API_TOKEN = 'test-token';
    retryFetch.mockResolvedValue(mockResponse);
    random.fromArray.mockReturnValue('test');

    const result = await createSyntheticTask();

    expect(result.metadata.keyword).toBe('"test"');
  });

  test('should throw error when CHUTES_API_TOKEN is not configured', async () => {
    delete process.env.CHUTES_API_TOKEN;

    await expect(createSyntheticTask()).rejects.toThrow('CHUTES_API_TOKEN not configured');
    expect(logger.error).toHaveBeenCalledWith(
      'X Tweets - Error creating synthetic task (took 1.50s):',
      expect.any(Error)
    );
  });

  test('should throw error when API response is not ok', async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    };

    process.env.CHUTES_API_TOKEN = 'test-token';
    retryFetch.mockResolvedValue(mockResponse);

    await expect(createSyntheticTask()).rejects.toThrow('Chutes API error: 500 Internal Server Error');
  });

  test('should throw error when no content in response', async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        choices: [{}] // No message content
      })
    };

    process.env.CHUTES_API_TOKEN = 'test-token';
    retryFetch.mockResolvedValue(mockResponse);

    await expect(createSyntheticTask()).rejects.toThrow('No content in Chutes API response');
  });

  test('should throw error when invalid keywords array', async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        choices: [{
          message: {
            content: 'not an array'
          }
        }]
      })
    };

    process.env.CHUTES_API_TOKEN = 'test-token';
    retryFetch.mockResolvedValue(mockResponse);

    await expect(createSyntheticTask()).rejects.toThrow('Unexpected token \'o\', "not an array" is not valid JSON');
  });

  test('should throw error when empty keywords array', async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        choices: [{
          message: {
            content: '[]'
          }
        }]
      })
    };

    process.env.CHUTES_API_TOKEN = 'test-token';
    retryFetch.mockResolvedValue(mockResponse);

    await expect(createSyntheticTask()).rejects.toThrow('Invalid keywords array from Chutes API');
  });

  test('should handle API call failure', async () => {
    process.env.CHUTES_API_TOKEN = 'test-token';
    retryFetch.mockRejectedValue(new Error('Network error'));

    await expect(createSyntheticTask()).rejects.toThrow('Network error');
    expect(logger.error).toHaveBeenCalledWith(
      'X Tweets - Error creating synthetic task (took 1.50s):',
      expect.any(Error)
    );
  });
});
