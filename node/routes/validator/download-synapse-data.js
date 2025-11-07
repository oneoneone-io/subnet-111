import logger from '#modules/logger/index.js';
import responseService from '#modules/response/index.js';
import s3 from '#modules/s3/index.js';
import archiver from 'archiver';

/**
 * Validate the request
 * @param {string} date - The date to download
 * @returns {Object} - Validation result
 */
const validate = (date) => {
  let isValid = true;
  let message = {};

  if (!date) {
    isValid = false;
    message = {
      error: 'Invalid request',
      message: 'date parameter is required (format: YYYY-MM-DD)'
    };
  } else if (!process.env.S3_ENABLED || process.env.S3_ENABLED !== 'true') {
    isValid = false;
    message = {
      error: 'Service unavailable',
      message: 'S3 storage is not enabled on this validator'
    };
  }

  return { isValid, message };
}

/**
 * Download and zip synapse data for a specific date
 * @param {import('express').Request} request - The request object
 * @param {import('express').Response} response - The response object
 * @returns {Promise<void>}
 */
const execute = async (request, response) => {
  try {
    const { date } = request.query;

    // Validate request
    const { isValid, message } = validate(date);
    if (!isValid) {
      return responseService.badRequest(response, message);
    }

    logger.info(`Download request for date: ${date}`);

    // Get bucket name
    const bucketName = process.env.S3_BUCKET || 'subnet-111-synapse-results';

    // List all files for the date
    const fileList = await s3.listObjects(bucketName, `${date}/`);

    if (fileList.length === 0) {
      return responseService.notFound(response, {
        error: 'No data found',
        message: `No synapse data found for date: ${date}`
      });
    }

    logger.info(`Found ${fileList.length} files for ${date}. Creating zip...`);

    // Create zip archive
    const archive = archiver('zip', { zlib: { level: 9 } });

    // Set response headers for zip download
    response.setHeader('Content-Type', 'application/zip');
    response.setHeader('Content-Disposition', `attachment; filename="synapse-data-${date}.zip"`);

    // Pipe archive to response
    archive.pipe(response);

    // Download each file from S3 and add to zip
    for (const objectName of fileList) {
      try {
        const data = await s3.downloadJson(bucketName, objectName);
        if (data) {
          // Add to zip with original path structure
          archive.append(JSON.stringify(data, undefined, 2), { name: objectName });
        }
      } catch (error) {
        logger.error(`Error downloading ${objectName}:`, error);
      }
    }

    // Finalize the archive
    await archive.finalize();
    logger.info(`Zip created and sent successfully for ${date}`);

  } catch (error) {
    logger.error('Error in download-synapse-data:', error);
    if (!response.headersSent) {
      return responseService.internalServerError(response, {
        error: 'Failed to download synapse data',
        message: error.message
      });
    }
  }
}

export default {
  execute,
  validate
}

