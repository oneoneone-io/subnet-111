import getS3Identifier from './get-s3-identifier.js';

describe('#utils/validator/types/x-tweets/score/get-s3-identifier.js', () => {
  test('should return metadata.keyword when it exists', () => {
    const metadata = { keyword: 'test-keyword' };
    const result = getS3Identifier(metadata);
    expect(result).toBe('test-keyword');
  });

  test('should remove leading and trailing quotes from keyword', () => {
    const metadata = { keyword: '"test-keyword"' };
    const result = getS3Identifier(metadata);
    expect(result).toBe('test-keyword');
  });

  test('should return "unknown" when metadata.keyword is undefined', () => {
    const metadata = { keyword: undefined };
    const result = getS3Identifier(metadata);
    expect(result).toBe('unknown');
  });
});

