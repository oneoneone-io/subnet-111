import * as Minio from 'minio';
import logger from '#modules/logger/index.js';

let minioClient;

/**
 * Initialize Minio client
 * @returns {Minio.Client|undefined} - The Minio client or undefined if not enabled
 */
function getClient() {
  // Check if S3 is enabled
  if (process.env.S3_ENABLED !== 'true') {
    return;
  }

  // Return existing client if already initialized
  if (minioClient) {
    return minioClient;
  }

  // Validate required environment variables
  if (!process.env.S3_SEED || !process.env.S3_ENDPOINT) {
    logger.warning('S3_SEED or S3_ENDPOINT not configured. S3 upload disabled.');
    return;
  }

  try {
    const seedPhrase = process.env.S3_SEED;
    const accessKey = Buffer.from(seedPhrase, 'utf8').toString('base64');

    minioClient = new Minio.Client({
      endPoint: process.env.S3_ENDPOINT,
      port: 443,
      useSSL: true,
      accessKey: accessKey,
      secretKey: seedPhrase,
      region: 'decentralized',
    });

    logger.info('S3 client initialized successfully');
    return minioClient;
  } catch (error) {
    logger.error('Failed to initialize S3 client:', error);
    return;
  }
}

/**
 * Ensure bucket exists, create if it doesn't
 * @param {string} bucketName - The bucket name
 * @returns {Promise<boolean>} - True if bucket exists or was created
 */
async function ensureBucket(bucketName) {
  const client = getClient();

  try {
    const exists = await client.bucketExists(bucketName);
    if (exists) {
      return true;
    }

    await client.makeBucket(bucketName, 'decentralized');
    logger.info(`S3 bucket '${bucketName}' created successfully`);
    return true;
  } catch (error) {
    logger.error(`Failed to ensure bucket '${bucketName}':`, error);
    return false;
  }
}

/**
 * Upload JSON data to S3
 * @param {string} bucketName - The bucket name
 * @param {string} objectName - The object path/name
 * @param {Object} data - The data to upload
 * @returns {Promise<boolean>} - True if upload successful
 */
async function uploadJson(bucketName, objectName, data) {
  const client = getClient();
  if (!client) return false;

  try {
    // Ensure bucket exists
    const bucketReady = await ensureBucket(bucketName);
    if (!bucketReady) {
      return false;
    }

    // Convert data to JSON string
    const jsonString = JSON.stringify(data, undefined, 2);
    const buffer = Buffer.from(jsonString, 'utf8');

    // Upload to S3
    await client.putObject(bucketName, objectName, buffer, buffer.length, {
      'Content-Type': 'application/json'
    });

    logger.info(`Successfully uploaded to S3: ${bucketName}/${objectName}`);
    return true;
  } catch (error) {
    logger.error(`Failed to upload to S3 (${bucketName}/${objectName}):`, error);
    return false;
  }
}

/**
 * Download JSON data from S3
 * @param {string} bucketName - The bucket name
 * @param {string} objectName - The object path/name
 * @returns {Promise<Object|undefined>} - The downloaded data or undefined if failed
 */
async function downloadJson(bucketName, objectName) {
  const client = getClient();
  if (!client) return;

  try {
    const chunks = [];

    // Get object stream
    const stream = await client.getObject(bucketName, objectName);

    // Collect chunks
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    // Combine chunks and parse JSON
    const buffer = Buffer.concat(chunks);
    const jsonString = buffer.toString('utf8');
    const data = JSON.parse(jsonString);

    logger.info(`Successfully downloaded from S3: ${bucketName}/${objectName}`);
    return data;
  } catch (error) {
    logger.error(`Failed to download from S3 (${bucketName}/${objectName}):`, error);
    return;
  }
}

/**
 * List objects in S3 with a specific prefix
 * @param {string} bucketName - The bucket name
 * @param {string} prefix - The prefix to filter objects (e.g., '2025-11-01/')
 * @returns {Promise<Array<string>>} - Array of object names
 */
async function listObjects(bucketName, prefix) {
  const client = getClient();
  if (!client) return [];

  try {
    const objectsList = [];
    const stream = client.listObjects(bucketName, prefix, true);

    for await (const item of stream) {
      if (item.name) {
        objectsList.push(item.name);
      }
    }

    logger.info(`Found ${objectsList.length} objects in S3 with prefix: ${prefix}`);
    return objectsList;
  } catch (error) {
    logger.error(`Failed to list objects in S3 (${bucketName}/${prefix}):`, error);
    return [];
  }
}

export default {
  uploadJson,
  downloadJson,
  listObjects
}

