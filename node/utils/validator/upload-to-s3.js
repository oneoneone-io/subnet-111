import s3 from '#modules/s3/index.js';
import logger from '#modules/logger/index.js';
import array from '#modules/array/index.js';

/**
 * Generate S3 details
 * @param {string} typeId - The type ID
 * @param {Object} metadata - The metadata
 * @returns {Object} - The S3 details
 */
const generateS3Details = (selectedType, metadata) => {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const timeString = now.toTimeString().split(' ')[0].replaceAll(':', '-');
  const identifier = selectedType.s3.getS3Identifier(metadata);
  const s3Bucket = process.env.S3_BUCKET || 'subnet-111-synapse-results';
  const s3Path = `${date}/${selectedType.id}/${timeString}_${identifier}.json`;

  return {
    s3Bucket,
    s3Path
  }
}

/**
 * Upload synapse results to S3
 * @param {string} typeId - The type ID
 * @param {Object} metadata - The metadata
 * @param {Array} responses - The responses to upload
 * @returns {Promise<number>} - The count of unique items uploaded
 */
async function cleanAndUploadToS3(s3Bucket, s3Path, selectedType, responses) {
  try {
    // Flatten and deduplicate responses
    const flatResponses = responses
      .filter(response => Array.isArray(response) && response.length > 0)
      .flat();

    // Deduplicate by ID before stripping
    const uniqueResponses = [];
    const seenIds = new Set();
    const idField = selectedType.s3.idField;

    for (const item of flatResponses) {
      const itemId = item[idField];
      if (itemId && !seenIds.has(itemId)) {
        seenIds.add(itemId);
        uniqueResponses.push(item);
      }
    }

    // Strip IDs
    const cleanedResponses = array.removeFields(uniqueResponses, selectedType.s3.stripFields);

    // Only upload if we have data
    if (cleanedResponses.length === 0) {
      logger.warning('No valid responses to upload to S3');
      return 0;
    }

    // Upload to S3
    await s3.uploadJson(s3Bucket, s3Path, cleanedResponses);

    return cleanedResponses.length;
  } catch (error) {
    logger.error('Error in uploadToS3:', error);
    throw error;
  }
}

async function uploadToS3(validationResults, metadata, selectedType) {
  // Use allValidatedItems from validationResults (contains only validated items)
  const validatedResponses = validationResults
    .filter(vr => vr.passedValidation)
    .map(vr => vr.allValidatedItems || []);

  try {
    // Generate S3 details
    const { s3Bucket, s3Path } = generateS3Details(selectedType, metadata);

    // Upload to S3 and get actual unique item count after deduplication
    const totalItemCount = await cleanAndUploadToS3(s3Bucket, s3Path, selectedType, validatedResponses)

    return {
      totalItemCount,
      s3Bucket,
      s3Path
    }
  } catch (error) {
    logger.error('Error in uploadToS3:', error);
    throw error;
  }
}

export default uploadToS3;
