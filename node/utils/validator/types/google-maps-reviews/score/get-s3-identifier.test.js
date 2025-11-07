import getS3Identifier from './get-s3-identifier.js';

describe('#utils/validator/types/google-maps-reviews/score/get-s3-identifier.js', () => {
  test('should return metadata.name when it exists', () => {
    const metadata = { name: 'test-location' };
    const result = getS3Identifier(metadata);
    expect(result).toBe('test-location');
  });

  test('should return "unknown" when metadata.name is explicitly undefined', () => {
    const metadata = { name: undefined };
    const result = getS3Identifier(metadata);
    expect(result).toBe('unknown');
  });
});

