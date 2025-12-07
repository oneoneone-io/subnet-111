import * as Minio from 'minio';
import logger from '#modules/logger/index.js';

jest.mock('minio');
jest.mock('#modules/logger/index.js', () => ({
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn()
}));

// Helper async generator functions
async function* createMockStream(data) {
  yield data;
}

async function* createMockStreamWithChunks(chunk1, chunk2) {
  yield chunk1;
  yield chunk2;
}

async function* createMockObjectsStream(items) {
  for (const item of items) {
    yield item;
  }
}

async function* createErrorStream() {
  throw new Error('List failed');
}

describe('modules/s3', () => {
  const originalEnvironment = process.env;
  let mockClient;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnvironment };
    delete process.env.S3_ENABLED;
    delete process.env.S3_SEED;
    delete process.env.S3_ENDPOINT;
    delete process.env.S3_ACCESS_KEY;
    delete process.env.S3_SECRET_KEY;

    // Setup mock client
    mockClient = {
      bucketExists: jest.fn(),
      makeBucket: jest.fn(),
      putObject: jest.fn(),
      getObject: jest.fn(),
      listObjects: jest.fn()
    };

    // Clear all mocks
    jest.clearAllMocks();
    Minio.Client.mockImplementation(() => mockClient);
  });

  afterEach(() => {
    process.env = originalEnvironment;
  });

  describe('uploadJson()', () => {
    test('should return false when S3 is not enabled', async () => {
      await jest.isolateModulesAsync(async () => {
        process.env.S3_ENABLED = 'false';
        const s3ModuleImport = await import('./index.js');
        const s3Module = s3ModuleImport.default;

        const result = await s3Module.uploadJson('test-bucket', 'test.json', { data: 'test' });

        expect(result).toBe(false);
        expect(Minio.Client).not.toHaveBeenCalled();
      });
    });

    test('should return false when credentials are missing', async () => {
      await jest.isolateModulesAsync(async () => {
        process.env.S3_ENABLED = 'true';
        process.env.S3_ENDPOINT = 'test.endpoint.com';
        const s3ModuleImport = await import('./index.js');
        const s3Module = s3ModuleImport.default;

        const result = await s3Module.uploadJson('test-bucket', 'test.json', { data: 'test' });

        expect(result).toBe(false);
        expect(logger.warning).toHaveBeenCalledWith('S3 credentials not configured (need S3_SEED or S3_ACCESS_KEY/S3_SECRET_KEY). S3 disabled.');
      });
    });

    test('should return false when S3_ENDPOINT is missing', async () => {
      await jest.isolateModulesAsync(async () => {
        process.env.S3_ENABLED = 'true';
        process.env.S3_SEED = 'test-seed';
        const s3ModuleImport = await import('./index.js');
        const s3Module = s3ModuleImport.default;

        const result = await s3Module.uploadJson('test-bucket', 'test.json', { data: 'test' });

        expect(result).toBe(false);
        expect(logger.warning).toHaveBeenCalledWith('S3_ENDPOINT not configured. S3 disabled.');
      });
    });

    test('should work with S3_ACCESS_KEY and S3_SECRET_KEY', async () => {
      await jest.isolateModulesAsync(async () => {
        process.env.S3_ENABLED = 'true';
        process.env.S3_ACCESS_KEY = 'test-access-key';
        process.env.S3_SECRET_KEY = 'test-secret-key';
        process.env.S3_ENDPOINT = 'test.endpoint.com';

        mockClient.bucketExists.mockResolvedValue(true);
        mockClient.putObject.mockResolvedValue();

        const s3ModuleImport = await import('./index.js');
        const s3Module = s3ModuleImport.default;
        const result = await s3Module.uploadJson('test-bucket', 'test.json', { data: 'test' });

        expect(result).toBe(true);
        expect(Minio.Client).toHaveBeenCalledWith(
          expect.objectContaining({
            accessKey: 'test-access-key',
            secretKey: 'test-secret-key'
          })
        );
      });
    });

    test('should return false when client initialization fails', async () => {
      await jest.isolateModulesAsync(async () => {
        process.env.S3_ENABLED = 'true';
        process.env.S3_SEED = 'test-seed';
        process.env.S3_ENDPOINT = 'test.endpoint.com';

        const error = new Error('Client init failed');
        Minio.Client.mockImplementation(() => {
          throw error;
        });

        const s3ModuleImport = await import('./index.js');
        const s3Module = s3ModuleImport.default;
        const result = await s3Module.uploadJson('test-bucket', 'test.json', { data: 'test' });

        expect(result).toBe(false);
        expect(logger.error).toHaveBeenCalledWith('Failed to initialize S3 client:', error);
      });
    });

    test('should return false when bucket creation fails', async () => {
      await jest.isolateModulesAsync(async () => {
        process.env.S3_ENABLED = 'true';
        process.env.S3_SEED = 'test-seed';
        process.env.S3_ENDPOINT = 'test.endpoint.com';

        mockClient.bucketExists.mockRejectedValue(new Error('Bucket check failed'));

        const s3ModuleImport = await import('./index.js');
        const s3Module = s3ModuleImport.default;
        const result = await s3Module.uploadJson('test-bucket', 'test.json', { data: 'test' });

        expect(result).toBe(false);
        expect(logger.error).toHaveBeenCalledWith(
          "Failed to ensure bucket 'test-bucket':",
          expect.any(Error)
        );
      });
    });

    test('should upload successfully when bucket exists', async () => {
      await jest.isolateModulesAsync(async () => {
        process.env.S3_ENABLED = 'true';
        process.env.S3_SEED = 'test-seed';
        process.env.S3_ENDPOINT = 'test.endpoint.com';

        mockClient.bucketExists.mockResolvedValue(true);
        mockClient.putObject.mockResolvedValue();

        const s3ModuleImport = await import('./index.js');
        const s3Module = s3ModuleImport.default;
        const testData = { data: 'test', value: 123 };
        const result = await s3Module.uploadJson('test-bucket', 'test.json', testData);

        expect(result).toBe(true);
        expect(logger.info).toHaveBeenCalledWith('S3 client initialized successfully');
        expect(mockClient.bucketExists).toHaveBeenCalledWith('test-bucket');
        expect(mockClient.putObject).toHaveBeenCalledWith(
          'test-bucket',
          'test.json',
          expect.any(Buffer),
          expect.any(Number),
          { 'Content-Type': 'application/json' }
        );
        expect(logger.info).toHaveBeenCalledWith('Successfully uploaded to S3: test-bucket/test.json');
      });
    });

    test('should create bucket if it does not exist', async () => {
      await jest.isolateModulesAsync(async () => {
        process.env.S3_ENABLED = 'true';
        process.env.S3_SEED = 'new-seed';
        process.env.S3_ENDPOINT = 'new.endpoint.com';

        mockClient.bucketExists.mockResolvedValue(false);
        mockClient.makeBucket.mockResolvedValue();
        mockClient.putObject.mockResolvedValue();

        const s3ModuleImport = await import('./index.js');
        const s3Module = s3ModuleImport.default;
        const result = await s3Module.uploadJson('new-bucket', 'test.json', { data: 'test' });

        expect(result).toBe(true);
        expect(mockClient.makeBucket).toHaveBeenCalledWith('new-bucket', 'decentralized');
        expect(logger.info).toHaveBeenCalledWith("S3 bucket 'new-bucket' created successfully");
      });
    });

    test('should return false when upload fails', async () => {
      await jest.isolateModulesAsync(async () => {
        process.env.S3_ENABLED = 'true';
        process.env.S3_SEED = 'another-seed';
        process.env.S3_ENDPOINT = 'another.endpoint.com';

        mockClient.bucketExists.mockResolvedValue(true);
        mockClient.putObject.mockRejectedValue(new Error('Upload failed'));

        const s3ModuleImport = await import('./index.js');
        const s3Module = s3ModuleImport.default;
        const result = await s3Module.uploadJson('fail-bucket', 'test.json', { data: 'test' });

        expect(result).toBe(false);
        expect(logger.error).toHaveBeenCalledWith(
          'Failed to upload to S3 (fail-bucket/test.json):',
          expect.any(Error)
        );
      });
    });
  });

  describe('downloadJson()', () => {
    test('should return undefined when S3 is not enabled', async () => {
      await jest.isolateModulesAsync(async () => {
        process.env.S3_ENABLED = 'false';
        const s3ModuleImport = await import('./index.js');
        const s3Module = s3ModuleImport.default;

        const result = await s3Module.downloadJson('test-bucket', 'test.json');

        expect(result).toBeUndefined();
      });
    });

    test('should download and parse JSON successfully', async () => {
      await jest.isolateModulesAsync(async () => {
        process.env.S3_ENABLED = 'true';
        process.env.S3_SEED = 'download-seed';
        process.env.S3_ENDPOINT = 'download.endpoint.com';

        const testData = { data: 'test', value: 123 };
        const jsonString = JSON.stringify(testData);
        const buffer = Buffer.from(jsonString, 'utf8');

        mockClient.getObject.mockResolvedValue(createMockStream(buffer));

        const s3ModuleImport = await import('./index.js');
        const s3Module = s3ModuleImport.default;
        const result = await s3Module.downloadJson('test-bucket', 'test.json');

        expect(result).toEqual(testData);
        expect(mockClient.getObject).toHaveBeenCalledWith('test-bucket', 'test.json');
        expect(logger.info).toHaveBeenCalledWith('Successfully downloaded from S3: test-bucket/test.json');
      });
    });

    test('should handle multiple chunks', async () => {
      await jest.isolateModulesAsync(async () => {
        process.env.S3_ENABLED = 'true';
        process.env.S3_SEED = 'chunks-seed';
        process.env.S3_ENDPOINT = 'chunks.endpoint.com';

        const testData = { data: 'test' };
        const jsonString = JSON.stringify(testData);
        const chunk1 = Buffer.from(jsonString.slice(0, 5), 'utf8');
        const chunk2 = Buffer.from(jsonString.slice(5), 'utf8');

        mockClient.getObject.mockResolvedValue(createMockStreamWithChunks(chunk1, chunk2));

        const s3ModuleImport = await import('./index.js');
        const s3Module = s3ModuleImport.default;
        const result = await s3Module.downloadJson('test-bucket', 'test.json');

        expect(result).toEqual(testData);
      });
    });

    test('should return undefined when download fails', async () => {
      await jest.isolateModulesAsync(async () => {
        process.env.S3_ENABLED = 'true';
        process.env.S3_SEED = 'fail-download-seed';
        process.env.S3_ENDPOINT = 'fail-download.endpoint.com';

        mockClient.getObject.mockRejectedValue(new Error('Download failed'));

        const s3ModuleImport = await import('./index.js');
        const s3Module = s3ModuleImport.default;
        const result = await s3Module.downloadJson('test-bucket', 'test.json');

        expect(result).toBeUndefined();
        expect(logger.error).toHaveBeenCalledWith(
          'Failed to download from S3 (test-bucket/test.json):',
          expect.any(Error)
        );
      });
    });
  });

  describe('listObjects()', () => {
    test('should return empty array when S3 is not enabled', async () => {
      await jest.isolateModulesAsync(async () => {
        process.env.S3_ENABLED = 'false';
        const s3ModuleImport = await import('./index.js');
        const s3Module = s3ModuleImport.default;

        const result = await s3Module.listObjects('test-bucket', 'prefix/');

        expect(result).toEqual([]);
      });
    });

    test('should list objects successfully', async () => {
      await jest.isolateModulesAsync(async () => {
        process.env.S3_ENABLED = 'true';
        process.env.S3_SEED = 'list-seed';
        process.env.S3_ENDPOINT = 'list.endpoint.com';

        const items = [
          { name: 'prefix/file1.json' },
          { name: 'prefix/file2.json' },
          { name: 'prefix/file3.json' }
        ];

        mockClient.listObjects.mockReturnValue(createMockObjectsStream(items));

        const s3ModuleImport = await import('./index.js');
        const s3Module = s3ModuleImport.default;
        const result = await s3Module.listObjects('test-bucket', 'prefix/');

        expect(result).toEqual([
          'prefix/file1.json',
          'prefix/file2.json',
          'prefix/file3.json'
        ]);
        expect(mockClient.listObjects).toHaveBeenCalledWith('test-bucket', 'prefix/', true);
        expect(logger.info).toHaveBeenCalledWith('Found 3 objects in S3 with prefix: prefix/');
      });
    });

    test('should filter out items without name', async () => {
      await jest.isolateModulesAsync(async () => {
        process.env.S3_ENABLED = 'true';
        process.env.S3_SEED = 'filter-seed';
        process.env.S3_ENDPOINT = 'filter.endpoint.com';

        const items = [
          { name: 'prefix/file1.json' },
          { name: undefined },
          { name: 'prefix/file2.json' },
          {}
        ];

        mockClient.listObjects.mockReturnValue(createMockObjectsStream(items));

        const s3ModuleImport = await import('./index.js');
        const s3Module = s3ModuleImport.default;
        const result = await s3Module.listObjects('test-bucket', 'prefix/');

        expect(result).toEqual([
          'prefix/file1.json',
          'prefix/file2.json'
        ]);
      });
    });

    test('should return empty array when listing fails', async () => {
      await jest.isolateModulesAsync(async () => {
        process.env.S3_ENABLED = 'true';
        process.env.S3_SEED = 'fail-list-seed';
        process.env.S3_ENDPOINT = 'fail-list.endpoint.com';

        mockClient.listObjects.mockReturnValue(createErrorStream());

        const s3ModuleImport = await import('./index.js');
        const s3Module = s3ModuleImport.default;
        const result = await s3Module.listObjects('test-bucket', 'prefix/');

        expect(result).toEqual([]);
        expect(logger.error).toHaveBeenCalledWith(
          'Failed to list objects in S3 (test-bucket/prefix/):',
          expect.any(Error)
        );
      });
    });
  });

  describe('client caching', () => {
    test('should reuse cached client on multiple calls', async () => {
      await jest.isolateModulesAsync(async () => {
        process.env.S3_ENABLED = 'true';
        process.env.S3_SEED = 'cache-seed';
        process.env.S3_ENDPOINT = 'cache.endpoint.com';

        mockClient.bucketExists.mockResolvedValue(true);
        mockClient.putObject.mockResolvedValue();

        const s3ModuleImport = await import('./index.js');
        const s3Module = s3ModuleImport.default;

        // First call - should initialize client
        await s3Module.uploadJson('test-bucket', 'file1.json', { data: 'test1' });
        expect(Minio.Client).toHaveBeenCalledTimes(1);

        // Second call - should reuse cached client
        await s3Module.uploadJson('test-bucket', 'file2.json', { data: 'test2' });
        expect(Minio.Client).toHaveBeenCalledTimes(1); // Still 1, not called again
      });
    });

    test('should handle multiple operations with cached client', async () => {
      await jest.isolateModulesAsync(async () => {
        process.env.S3_ENABLED = 'true';
        process.env.S3_SEED = 'multi-seed';
        process.env.S3_ENDPOINT = 'multi.endpoint.com';

        mockClient.bucketExists.mockResolvedValue(true);
        mockClient.putObject.mockResolvedValue();

        const testData = { data: 'test', value: 123 };
        const jsonString = JSON.stringify(testData);
        const buffer = Buffer.from(jsonString, 'utf8');

        mockClient.getObject.mockResolvedValue(createMockStream(buffer));

        const listItems = [{ name: 'file1.json' }];
        mockClient.listObjects.mockReturnValue(createMockObjectsStream(listItems));

        const s3ModuleImport = await import('./index.js');
        const s3Module = s3ModuleImport.default;

        // Upload operation
        await s3Module.uploadJson('test-bucket', 'file.json', testData);

        // Download operation
        await s3Module.downloadJson('test-bucket', 'file.json');

        // List operation
        await s3Module.listObjects('test-bucket', '');

        // Client should only be initialized once
        expect(Minio.Client).toHaveBeenCalledTimes(1);
      });
    });
  });
});
