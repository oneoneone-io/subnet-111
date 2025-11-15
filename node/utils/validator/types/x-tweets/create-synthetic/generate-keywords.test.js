import {
  generateKeywordsFromChutes,
  generateKeywordsFromOpenRouter,
  parseKeywordsFromResponse,
} from './generate-keywords.js';
import retryFetch from '#modules/retry-fetch/index.js';
import random from '#modules/random/index.js';
import config from '#config';

// Mock dependencies
jest.mock('#modules/retry-fetch/index.js', () => jest.fn());

jest.mock('#modules/random/index.js', () => ({
  fromArray: jest.fn()
}));

jest.mock('#config', () => ({
  VALIDATOR: {
    X_TWEETS: {
      CHUTES_API_URL: 'https://api.chutes.ai/v1/chat/completions',
      OPENROUTER_API_URL: 'https://openrouter.ai/api/v1/chat/completions',
      CHUTES_MODELS: ['model1', 'model2'],
      OPENROUTER_MODELS: ['openrouter-model1', 'openrouter-model2']
    }
  }
}));

describe('generate-keywords', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CHUTES_API_TOKEN = 'test-chutes-token';
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
  });

  describe('parseKeywordsFromResponse', () => {
    test('should parse JSON array without markdown blocks', () => {
      const content = '["keyword1", "keyword2", "keyword3"]';
      const result = parseKeywordsFromResponse(content);
      expect(result).toEqual(['keyword1', 'keyword2', 'keyword3']);
    });

    test('should parse JSON array with ```json markdown blocks', () => {
      const content = '```json\n["keyword1", "keyword2", "keyword3"]\n```';
      const result = parseKeywordsFromResponse(content);
      expect(result).toEqual(['keyword1', 'keyword2', 'keyword3']);
    });

    test('should parse JSON array with ``` markdown blocks (no json tag)', () => {
      const content = '```\n["keyword1", "keyword2", "keyword3"]\n```';
      const result = parseKeywordsFromResponse(content);
      expect(result).toEqual(['keyword1', 'keyword2', 'keyword3']);
    });

    test('should handle content with whitespace', () => {
      const content = '  \n["keyword1", "keyword2"]  \n';
      const result = parseKeywordsFromResponse(content);
      expect(result).toEqual(['keyword1', 'keyword2']);
    });

    test('should throw error for non-array response', () => {
      const content = '{"key": "value"}';
      expect(() => parseKeywordsFromResponse(content)).toThrow('Invalid keywords array from API response');
    });

    test('should throw error for empty array', () => {
      const content = '[]';
      expect(() => parseKeywordsFromResponse(content)).toThrow('Invalid keywords array from API response');
    });

    test('should throw error for invalid JSON', () => {
      const content = 'not valid json';
      expect(() => parseKeywordsFromResponse(content)).toThrow();
    });
  });

  describe('generateKeywordsFromChutes', () => {
    test('should successfully generate keywords from Chutes API', async () => {
      const mockKeywords = ['keyword1', 'keyword2', 'keyword3'];
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify(mockKeywords)
              }
            }
          ]
        })
      };

      retryFetch.mockResolvedValue(mockResponse);
      random.fromArray.mockReturnValueOnce('GENERAL_PROMPT').mockReturnValueOnce('model1');

      const result = await generateKeywordsFromChutes();

      expect(result).toEqual(mockKeywords);
      expect(retryFetch).toHaveBeenCalledWith(
        'https://api.chutes.ai/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-chutes-token',
            'Content-Type': 'application/json'
          },
          body: expect.any(String)
        })
      );

      // Verify request body structure
      const requestBody = JSON.parse(retryFetch.mock.calls[0][1].body);
      expect(requestBody).toMatchObject({
        model: 'model1',
        messages: [
          {
            role: 'user',
            content: expect.any(String)
          }
        ],
        stream: false,
        max_tokens: 1024,
        temperature: 0.7
      });
    });

    test('should handle response with markdown blocks', async () => {
      const mockKeywords = ['keyword1', 'keyword2'];
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: `\`\`\`json\n${JSON.stringify(mockKeywords)}\n\`\`\``
              }
            }
          ]
        })
      };

      retryFetch.mockResolvedValue(mockResponse);
      random.fromArray.mockReturnValue('test-value');

      const result = await generateKeywordsFromChutes();
      expect(result).toEqual(mockKeywords);
    });

    test('should throw error when Chutes API returns non-ok response', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      };

      retryFetch.mockResolvedValue(mockResponse);
      random.fromArray.mockReturnValue('test-value');

      await expect(generateKeywordsFromChutes()).rejects.toThrow(
        'Chutes API error: 500 Internal Server Error'
      );
    });

    test('should throw error when Chutes API response has no content', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {}
            }
          ]
        })
      };

      retryFetch.mockResolvedValue(mockResponse);
      random.fromArray.mockReturnValue('test-value');

      await expect(generateKeywordsFromChutes()).rejects.toThrow(
        'No content in Chutes API response'
      );
    });

    test('should throw error when Chutes API response has no choices', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({})
      };

      retryFetch.mockResolvedValue(mockResponse);
      random.fromArray.mockReturnValue('test-value');

      await expect(generateKeywordsFromChutes()).rejects.toThrow(
        'No content in Chutes API response'
      );
    });
  });

  describe('generateKeywordsFromOpenRouter', () => {
    test('should successfully generate keywords from OpenRouter API', async () => {
      const mockKeywords = ['keyword1', 'keyword2', 'keyword3'];
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify(mockKeywords)
              }
            }
          ]
        })
      };

      retryFetch.mockResolvedValue(mockResponse);
      random.fromArray.mockReturnValueOnce('GENERAL_PROMPT').mockReturnValueOnce('openrouter-model1');

      const result = await generateKeywordsFromOpenRouter();

      expect(result).toEqual(mockKeywords);
      expect(retryFetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-openrouter-key',
            'Content-Type': 'application/json'
          },
          body: expect.any(String)
        })
      );

      // Verify request body structure
      const requestBody = JSON.parse(retryFetch.mock.calls[0][1].body);
      expect(requestBody).toMatchObject({
        model: 'openrouter-model1',
        messages: [
          {
            role: 'user',
            content: expect.any(String)
          }
        ],
        max_tokens: 1024,
        temperature: 0.7
      });
    });

    test('should handle response with markdown blocks', async () => {
      const mockKeywords = ['keyword1', 'keyword2'];
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: `\`\`\`\n${JSON.stringify(mockKeywords)}\n\`\`\``
              }
            }
          ]
        })
      };

      retryFetch.mockResolvedValue(mockResponse);
      random.fromArray.mockReturnValue('test-value');

      const result = await generateKeywordsFromOpenRouter();
      expect(result).toEqual(mockKeywords);
    });

    test('should throw error when OpenRouter API returns non-ok response', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: jest.fn().mockResolvedValue('Invalid API key')
      };

      retryFetch.mockResolvedValue(mockResponse);
      random.fromArray.mockReturnValue('test-value');

      await expect(generateKeywordsFromOpenRouter()).rejects.toThrow(
        'OpenRouter API error: 401 Unauthorized - Invalid API key'
      );
    });

    test('should throw error when OpenRouter API response has no content', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {}
            }
          ]
        })
      };

      retryFetch.mockResolvedValue(mockResponse);
      random.fromArray.mockReturnValue('test-value');

      await expect(generateKeywordsFromOpenRouter()).rejects.toThrow(
        'No content in OpenRouter API response'
      );
    });

    test('should throw error when OpenRouter API response has no choices', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({})
      };

      retryFetch.mockResolvedValue(mockResponse);
      random.fromArray.mockReturnValue('test-value');

      await expect(generateKeywordsFromOpenRouter()).rejects.toThrow(
        'No content in OpenRouter API response'
      );
    });
  });
});

