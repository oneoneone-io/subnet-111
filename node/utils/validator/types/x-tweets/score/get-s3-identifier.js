/**
 * Get the S3 identifier for the X Tweets
 * @param {Object} metadata - The metadata
 * @returns {string} - The S3 identifier
 */
const getS3Identifier = (metadata) => {
  return metadata.keyword?.replaceAll(/^"|"$/g, '') || 'unknown';
}

export default getS3Identifier;
