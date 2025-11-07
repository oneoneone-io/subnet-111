import uploadToS3 from './upload-to-s3.js';
import s3 from '#modules/s3/index.js';
import logger from '#modules/logger/index.js';

jest.mock('#modules/s3/index.js', () => ({
  uploadJson: jest.fn().mockResolvedValue(true),
}));

jest.mock('#modules/logger/index.js', () => ({
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
}));

describe('#utils/validator/upload-to-s3.js', () => {
  const originalEnvironment = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnvironment };
    process.env.S3_BUCKET = 'test-bucket';
  });

  afterEach(() => {
    process.env = originalEnvironment;
  });

  test('should upload deduplicated validated responses successfully', async () => {
    const validationResults = [
      {
        passedValidation: true,
        allValidatedItems: [
          { id: '1', name: 'Item 1', extra: 'data1' },
          { id: '2', name: 'Item 2', extra: 'data2' },
        ],
      },
      {
        passedValidation: true,
        allValidatedItems: [
          { id: '3', name: 'Item 3', extra: 'data3' },
        ],
      },
    ];

    const metadata = { keyword: 'test', name: 'Test Location' };
    const selectedType = {
      id: 'google-maps-reviews',
      s3: {
        getS3Identifier: jest.fn().mockReturnValue('test-identifier'),
        idField: 'id',
        stripFields: ['extra'],
      },
    };

    const result = await uploadToS3(validationResults, metadata, selectedType);

    expect(selectedType.s3.getS3Identifier).toHaveBeenCalledWith(metadata);
    expect(s3.uploadJson).toHaveBeenCalledWith(
      'test-bucket',
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}\/google-maps-reviews\/\d{2}-\d{2}-\d{2}_test-identifier\.json$/),
      expect.arrayContaining([
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
        { id: '3', name: 'Item 3' },
      ])
    );
    expect(result.totalItemCount).toBe(3);
    expect(result.s3Bucket).toBe('test-bucket');
    expect(result.s3Path).toMatch(/^\d{4}-\d{2}-\d{2}\/google-maps-reviews\/\d{2}-\d{2}-\d{2}_test-identifier\.json$/);
  });

  test('should use default S3 bucket when environment variable is not set', async () => {
    delete process.env.S3_BUCKET;

    const validationResults = [
      {
        passedValidation: true,
        allValidatedItems: [{ id: '1', name: 'Item 1' }],
      },
    ];

    const metadata = { keyword: 'test' };
    const selectedType = {
      id: 'x-tweets',
      s3: {
        getS3Identifier: jest.fn().mockReturnValue('identifier'),
        idField: 'id',
        stripFields: [],
      },
    };

    const result = await uploadToS3(validationResults, metadata, selectedType);

    expect(s3.uploadJson).toHaveBeenCalledWith(
      'subnet-111-synapse-results',
      expect.any(String),
      expect.any(Array)
    );
    expect(result.s3Bucket).toBe('subnet-111-synapse-results');
  });

  test('should filter out responses that did not pass validation', async () => {
    const validationResults = [
      {
        passedValidation: false,
        allValidatedItems: [{ id: '1', name: 'Item 1' }],
      },
      {
        passedValidation: true,
        allValidatedItems: [{ id: '2', name: 'Item 2' }],
      },
      {
        passedValidation: false,
        allValidatedItems: [{ id: '3', name: 'Item 3' }],
      },
    ];

    const metadata = { keyword: 'test' };
    const selectedType = {
      id: 'test-type',
      s3: {
        getS3Identifier: jest.fn().mockReturnValue('id'),
        idField: 'id',
        stripFields: [],
      },
    };

    const result = await uploadToS3(validationResults, metadata, selectedType);

    expect(result.totalItemCount).toBe(1);
    expect(s3.uploadJson).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      [{ id: '2', name: 'Item 2' }]
    );
  });

  test('should deduplicate responses by ID field', async () => {
    const validationResults = [
      {
        passedValidation: true,
        allValidatedItems: [
          { id: '1', name: 'Item 1' },
          { id: '2', name: 'Item 2' },
        ],
      },
      {
        passedValidation: true,
        allValidatedItems: [
          { id: '1', name: 'Duplicate Item 1' },
          { id: '3', name: 'Item 3' },
        ],
      },
    ];

    const metadata = { keyword: 'test' };
    const selectedType = {
      id: 'test-type',
      s3: {
        getS3Identifier: jest.fn().mockReturnValue('id'),
        idField: 'id',
        stripFields: [],
      },
    };

    const result = await uploadToS3(validationResults, metadata, selectedType);

    expect(result.totalItemCount).toBe(3);
    expect(s3.uploadJson).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.arrayContaining([
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
        { id: '3', name: 'Item 3' },
      ])
    );
  });

  test('should handle empty validated items', async () => {
    const validationResults = [
      {
        passedValidation: true,
        allValidatedItems: [],
      },
      {
        passedValidation: true,
        allValidatedItems: [],
      },
    ];

    const metadata = { keyword: 'test' };
    const selectedType = {
      id: 'test-type',
      s3: {
        getS3Identifier: jest.fn().mockReturnValue('id'),
        idField: 'id',
        stripFields: [],
      },
    };

    const result = await uploadToS3(validationResults, metadata, selectedType);

    expect(logger.warning).toHaveBeenCalledWith('No valid responses to upload to S3');
    expect(s3.uploadJson).not.toHaveBeenCalled();
    expect(result.totalItemCount).toBe(0);
  });

  test('should filter out items without ID field', async () => {
    const validationResults = [
      {
        passedValidation: true,
        allValidatedItems: [
          { id: '1', name: 'Item 1' },
          { name: 'Item without ID' },
          { id: undefined, name: 'Item with undefined ID' },
          { id: '2', name: 'Item 2' },
        ],
      },
    ];

    const metadata = { keyword: 'test' };
    const selectedType = {
      id: 'test-type',
      s3: {
        getS3Identifier: jest.fn().mockReturnValue('id'),
        idField: 'id',
        stripFields: [],
      },
    };

    const result = await uploadToS3(validationResults, metadata, selectedType);

    expect(result.totalItemCount).toBe(2);
    expect(s3.uploadJson).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.arrayContaining([
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ])
    );
  });

  test('should filter out non-array responses', async () => {
    const validationResults = [
      {
        passedValidation: true,
        allValidatedItems: undefined,
      },
      {
        passedValidation: true,
        allValidatedItems: [{ id: '1', name: 'Item 1' }],
      },
      {
        passedValidation: true,
        allValidatedItems: undefined,
      },
    ];

    const metadata = { keyword: 'test' };
    const selectedType = {
      id: 'test-type',
      s3: {
        getS3Identifier: jest.fn().mockReturnValue('id'),
        idField: 'id',
        stripFields: [],
      },
    };

    const result = await uploadToS3(validationResults, metadata, selectedType);

    expect(result.totalItemCount).toBe(1);
  });

  test('should throw error when S3 upload fails', async () => {
    s3.uploadJson.mockRejectedValue(new Error('S3 upload failed'));

    const validationResults = [
      {
        passedValidation: true,
        allValidatedItems: [{ id: '1', name: 'Item 1' }],
      },
    ];

    const metadata = { keyword: 'test' };
    const selectedType = {
      id: 'test-type',
      s3: {
        getS3Identifier: jest.fn().mockReturnValue('id'),
        idField: 'id',
        stripFields: [],
      },
    };

    await expect(uploadToS3(validationResults, metadata, selectedType)).rejects.toThrow('S3 upload failed');
    expect(logger.error).toHaveBeenCalledWith('Error in uploadToS3:', expect.any(Error));
  });
});

