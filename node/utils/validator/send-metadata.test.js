import sendMetadata from './send-metadata.js';
import retryFetch from '#modules/retry-fetch/index.js';
import logger from '#modules/logger/index.js';

jest.mock('#modules/retry-fetch/index.js', () => jest.fn().mockResolvedValue({}));

jest.mock('#modules/logger/index.js', () => ({
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
}));

describe('#utils/validator/send-metadata.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PLATFORM_TOKEN = 'test-token';
  });

  test('should send metadata successfully', async () => {
    const typeId = 'google-maps-reviews';
    const metadata = { keyword: '"test keyword"', name: 'Test Place' };
    const totalItemCount = 50;
    const s3Bucket = 'test-bucket';
    const s3Path = 'test/path/file.json';

    const mockResponse = { success: true };
    retryFetch.mockResolvedValue(mockResponse);

    const result = await sendMetadata(typeId, metadata, totalItemCount, s3Bucket, s3Path);

    expect(retryFetch).toHaveBeenCalledTimes(1);
    expect(retryFetch).toHaveBeenCalledWith('https://oneoneone.io/api/metadata', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: expect.any(String)
    });

    const requestBody = JSON.parse(retryFetch.mock.calls[0][1].body);
    expect(requestBody.type).toBe(typeId);
    expect(requestBody.keyword).toBe('test keyword');
    expect(requestBody.name).toBe('Test Place');
    expect(requestBody.count).toBe(totalItemCount);
    expect(requestBody.s3_bucket).toBe(s3Bucket);
    expect(requestBody.s3_path).toBe(s3Path);
    expect(requestBody.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(requestBody.timestamp).toBeDefined();

    expect(logger.info).toHaveBeenCalledWith(`Metadata sent successfully for ${typeId} - ${totalItemCount} items`);
    expect(result).toEqual(mockResponse);
  });

  test('should not send metadata if platform token is not set', async () => {
    process.env.PLATFORM_TOKEN = '';

    const result = await sendMetadata('x-tweets', {}, 10, 'bucket', 'path');

    expect(retryFetch).not.toHaveBeenCalled();
    expect(logger.warning).toHaveBeenCalledWith('Platform token is not set. Skipping metadata upload');
    expect(result).toBeUndefined();
  });

  test('should log error if fetch fails', async () => {
    retryFetch.mockRejectedValue(new Error('Network error'));

    const result = await sendMetadata('x-tweets', { name: 'Test' }, 25, 'bucket', 'path');

    expect(logger.error).toHaveBeenCalledWith('Error sending metadata: Error: Network error');
    expect(result).toBeUndefined();
  });
});

