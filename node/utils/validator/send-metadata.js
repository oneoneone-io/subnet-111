import logger from '#modules/logger/index.js';
import retryFetch from '#modules/retry-fetch/index.js';

const METADATA_API_URL = 'https://oneoneone.io/api/metadata';

/**
 * Send synapse metadata to the platform
 * @param {string} typeId - The type ID (e.g., 'google-maps-reviews', 'x-tweets')
 * @param {Object} metadata - The synapse metadata
 * @param {number} totalItemCount - Total number of items (tweets/reviews)
 * @param {string} s3Bucket - S3 bucket name
 * @param {string} s3Path - S3 file path
 * @returns {Promise<Object|undefined>} - The API response or undefined
 */
const sendMetadata = async (typeId, metadata, totalItemCount, s3Bucket, s3Path) => {
    if (!process.env.PLATFORM_TOKEN) {
        logger.warning('Platform token is not set. Skipping metadata upload');
        return;
    }

    try {
        const response = await retryFetch(METADATA_API_URL, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.PLATFORM_TOKEN}`
            },
            body: JSON.stringify({
                date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
                type: typeId,
                keyword: metadata.keyword?.replaceAll(/^"|"$/g, ''),
                name: metadata.name,
                count: totalItemCount,
                s3_bucket: s3Bucket,
                s3_path: s3Path,
                timestamp: new Date().toISOString()
            })
        });

        const data = await response.json();
        logger.info(`Metadata sent successfully for ${typeId} - ${totalItemCount} items`);
        return data;
    } catch (error) {
        logger.error(`Error sending metadata: ${error}`);
    }
}

export default sendMetadata

