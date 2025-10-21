import xTweetsType from './index.js';

// Mock the fetch module to avoid import issues
jest.mock('./fetch/index.js', () => ({
  __esModule: true,
  default: jest.fn()
}));

describe('utils/miner/types/x-tweets/index.js', () => {
  test('should export the correct type structure', () => {
    expect(xTweetsType).toEqual({
      id: 'x-tweets',
      fetch: expect.any(Function)
    });
  });

  test('should have the correct id', () => {
    expect(xTweetsType.id).toBe('x-tweets');
  });

  test('should export fetch function', () => {
    expect(typeof xTweetsType.fetch).toBe('function');
  });
});
