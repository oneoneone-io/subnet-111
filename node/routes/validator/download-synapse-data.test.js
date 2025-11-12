import downloadSynapseDataRoute from './download-synapse-data.js';
import logger from '#modules/logger/index.js';
import responseService from '#modules/response/index.js';
import s3 from '#modules/s3/index.js';
import archiver from 'archiver';

jest.mock('#modules/logger/index.js', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

jest.mock('#modules/response/index.js', () => ({
  badRequest: jest.fn(),
  notFound: jest.fn(),
  internalServerError: jest.fn(),
}));

jest.mock('#modules/s3/index.js', () => ({
  listObjects: jest.fn(),
  downloadJson: jest.fn(),
}));

jest.mock('archiver', () => {
  const mockArchive = {
    pipe: jest.fn(),
    append: jest.fn(),
    finalize: jest.fn(),
  };
  return jest.fn(() => mockArchive);
});

describe('routes/validator/download-synapse-data.js', () => {
  const originalEnvironment = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnvironment };
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  describe('.validate()', () => {
    test('should fail if date is not provided', () => {
      const { isValid, message } = downloadSynapseDataRoute.validate();

      expect(isValid).toBe(false);
      expect(message).toEqual({
        error: 'Invalid request',
        message: 'date parameter is required (format: YYYY-MM-DD)'
      });
    });

    test('should fail if S3_ENABLED is not set', () => {
      delete process.env.S3_ENABLED;

      const { isValid, message } = downloadSynapseDataRoute.validate('2024-01-01');

      expect(isValid).toBe(false);
      expect(message).toEqual({
        error: 'Service unavailable',
        message: 'S3 storage is not enabled on this validator'
      });
    });

    test('should fail if S3_ENABLED is not true', () => {
      process.env.S3_ENABLED = 'false';

      const { isValid, message } = downloadSynapseDataRoute.validate('2024-01-01');

      expect(isValid).toBe(false);
      expect(message).toEqual({
        error: 'Service unavailable',
        message: 'S3 storage is not enabled on this validator'
      });
    });

    test('should pass validation when date is provided and S3 is enabled', () => {
      process.env.S3_ENABLED = 'true';

      const { isValid, message } = downloadSynapseDataRoute.validate('2024-01-01');

      expect(isValid).toBe(true);
      expect(message).toEqual({});
    });
  });

  describe('.execute()', () => {
    let request;
    let response;
    let mockArchiveInstance;

    beforeEach(() => {
      request = {
        query: {
          date: '2024-01-01'
        }
      };

      response = {
        setHeader: jest.fn(),
        headersSent: false
      };

      process.env.S3_ENABLED = 'true';
      process.env.S3_BUCKET = 'test-bucket';

      mockArchiveInstance = archiver();
    });

    test('should return badRequest if validation fails (missing date)', async () => {
      request.query = {};

      await downloadSynapseDataRoute.execute(request, response);

      expect(responseService.badRequest).toHaveBeenCalledWith(response, {
        error: 'Invalid request',
        message: 'date parameter is required (format: YYYY-MM-DD)'
      });
    });

    test('should return badRequest if S3 is not enabled', async () => {
      delete process.env.S3_ENABLED;

      await downloadSynapseDataRoute.execute(request, response);

      expect(responseService.badRequest).toHaveBeenCalledWith(response, {
        error: 'Service unavailable',
        message: 'S3 storage is not enabled on this validator'
      });
    });

    test('should return notFound if no files found for the date', async () => {
      s3.listObjects.mockResolvedValue([]);

      await downloadSynapseDataRoute.execute(request, response);

      expect(logger.info).toHaveBeenCalledWith('Download request for date: 2024-01-01');
      expect(s3.listObjects).toHaveBeenCalledWith('test-bucket', '2024-01-01/');
      expect(responseService.notFound).toHaveBeenCalledWith(response, {
        error: 'No data found',
        message: 'No synapse data found for date: 2024-01-01'
      });
    });

    test('should use default bucket name if S3_BUCKET not set', async () => {
      delete process.env.S3_BUCKET;
      s3.listObjects.mockResolvedValue([]);

      await downloadSynapseDataRoute.execute(request, response);

      expect(s3.listObjects).toHaveBeenCalledWith('subnet-111-synapse-results', '2024-01-01/');
    });

    test('should create zip and stream files successfully', async () => {
      const fileList = ['2024-01-01/file1.json', '2024-01-01/file2.json'];
      const mockData1 = { id: 1, data: 'test1' };
      const mockData2 = { id: 2, data: 'test2' };

      s3.listObjects.mockResolvedValue(fileList);
      s3.downloadJson
        .mockResolvedValueOnce(mockData1)
        .mockResolvedValueOnce(mockData2);

      await downloadSynapseDataRoute.execute(request, response);

      expect(logger.info).toHaveBeenCalledWith('Download request for date: 2024-01-01');
      expect(logger.info).toHaveBeenCalledWith('Found 2 files for 2024-01-01. Creating zip...');
      expect(response.setHeader).toHaveBeenCalledWith('Content-Type', 'application/zip');
      expect(response.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="synapse-data-2024-01-01.zip"');
      expect(mockArchiveInstance.pipe).toHaveBeenCalledWith(response);
      expect(mockArchiveInstance.append).toHaveBeenCalledWith(JSON.stringify(mockData1, undefined, 2), { name: '2024-01-01/file1.json' });
      expect(mockArchiveInstance.append).toHaveBeenCalledWith(JSON.stringify(mockData2, undefined, 2), { name: '2024-01-01/file2.json' });
      expect(mockArchiveInstance.finalize).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Zip created and sent successfully for 2024-01-01');
    });

    test('should continue processing if one file download fails', async () => {
      const fileList = ['2024-01-01/file1.json', '2024-01-01/file2.json'];
      const mockData2 = { id: 2, data: 'test2' };

      s3.listObjects.mockResolvedValue(fileList);
      s3.downloadJson
        .mockRejectedValueOnce(new Error('Download failed'))
        .mockResolvedValueOnce(mockData2);

      await downloadSynapseDataRoute.execute(request, response);

      expect(logger.error).toHaveBeenCalledWith('Error downloading 2024-01-01/file1.json:', expect.any(Error));
      expect(mockArchiveInstance.append).toHaveBeenCalledTimes(1);
      expect(mockArchiveInstance.append).toHaveBeenCalledWith(JSON.stringify(mockData2, undefined, 2), { name: '2024-01-01/file2.json' });
      expect(mockArchiveInstance.finalize).toHaveBeenCalled();
    });

    test('should skip file if downloadJson returns null', async () => {
      const fileList = ['2024-01-01/file1.json'];

      s3.listObjects.mockResolvedValue(fileList);
      s3.downloadJson.mockResolvedValue();

      await downloadSynapseDataRoute.execute(request, response);

      expect(mockArchiveInstance.append).not.toHaveBeenCalled();
      expect(mockArchiveInstance.finalize).toHaveBeenCalled();
    });

    test('should return internalServerError if listObjects fails', async () => {
      s3.listObjects.mockRejectedValue(new Error('S3 connection failed'));

      await downloadSynapseDataRoute.execute(request, response);

      expect(logger.error).toHaveBeenCalledWith('Error in download-synapse-data:', expect.any(Error));
      expect(responseService.internalServerError).toHaveBeenCalledWith(response, {
        error: 'Failed to download synapse data',
        message: 'S3 connection failed'
      });
    });

    test('should not send error response if headers already sent', async () => {
      s3.listObjects.mockRejectedValue(new Error('S3 connection failed'));
      response.headersSent = true;

      await downloadSynapseDataRoute.execute(request, response);

      expect(logger.error).toHaveBeenCalledWith('Error in download-synapse-data:', expect.any(Error));
      expect(responseService.internalServerError).not.toHaveBeenCalled();
    });

    test('should handle archive finalization error', async () => {
      const fileList = ['2024-01-01/file1.json'];
      const mockData = { id: 1, data: 'test' };

      s3.listObjects.mockResolvedValue(fileList);
      s3.downloadJson.mockResolvedValue(mockData);
      mockArchiveInstance.finalize.mockRejectedValue(new Error('Finalization failed'));

      await downloadSynapseDataRoute.execute(request, response);

      expect(logger.error).toHaveBeenCalledWith('Error in download-synapse-data:', expect.any(Error));
      expect(responseService.internalServerError).toHaveBeenCalledWith(response, {
        error: 'Failed to download synapse data',
        message: 'Finalization failed'
      });
    });
  });
});

