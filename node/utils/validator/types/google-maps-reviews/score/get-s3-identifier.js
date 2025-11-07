/**
 * Get the S3 identifier for the Google Maps reviews
 * @param {Object} metadata - The metadata
 * @returns {string} - The S3 identifier
 */
const getS3Identifier = (metadata) => {
  return metadata.name || 'unknown';
}

export default getS3Identifier;
