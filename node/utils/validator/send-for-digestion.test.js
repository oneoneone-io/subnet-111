import sendForDigestion from './send-for-digestion.js';
import retryFetch from '#modules/retry-fetch/index.js';
import logger from '#modules/logger/index.js';

jest.mock('#modules/retry-fetch/index.js', () => jest.fn().mockResolvedValue({}));

jest.mock('#modules/logger/index.js', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

describe('#utils/validator/send-for-digestion.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PLATFORM_TOKEN = 'test';
  });

  test('should send the data for digestion with metadata', async () => {
    const metadata = { keyword: '"bitcoin"', name: 'Test Place' };
    await sendForDigestion('google-maps-reviews', '123', [{ id: 1, name: 'test' }], metadata);
    expect(retryFetch).toHaveBeenCalledTimes(1);
    expect(retryFetch).toHaveBeenCalledWith('https://oneoneone.io/api/digest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PLATFORM_TOKEN}`
      },
      body: JSON.stringify({
        type: 'google-maps-reviews',
        miner_uid: '123',
        keyword: 'bitcoin',
        name: 'Test Place',
        data: [{ id: 1, name: 'test' }]
      })
    });
  });

  test('should not send the data for digestion if the platform token is not set', async () => {
    process.env.PLATFORM_TOKEN = '';
    await sendForDigestion('google-maps-reviews', '123', [{ id: 1, name: 'test' }]);
    expect(retryFetch).not.toHaveBeenCalled();
  });

  test('should log an error if the fetch fails', async () => {
    retryFetch.mockRejectedValue(new Error('Fetch failed'));
    await sendForDigestion('google-maps-reviews', '123', [{ id: 1, name: 'test' }]);
    expect(logger.error).toHaveBeenCalledWith('Error sending for digestion: Error: Fetch failed');
  });
});
