import sendForDigestion from '#utils/validator/send-for-digestion.js';
import array from '#modules/array/index.js';
import logger from '#modules/logger/index.js';

const prepareAndSendForDigestion = async (responses, minerUIDs, metadata) => {
    for(const [index, response] of responses.entries()){
        const minerUID = minerUIDs[index] || index;

        // Data Cleaning - Remove duplicate reviews by reviewId
        const uniqueReviews = array.uniqueBy(response, 'reviewId');
        logger.info(`Google Maps Reviews - UID ${minerUID}: Data cleaning - ${response.length} reviews -> ${uniqueReviews.length} unique reviews`);

        // Structural Validation - Check required fields and types
        const requiredFields = [
            { name: 'reviewerId', type: 'string' },
            { name: 'reviewerUrl', type: 'string' },
            { name: 'reviewerName', type: 'string' },
            { name: 'reviewId', type: 'string' },
            { name: 'reviewUrl', type: 'string' },
            { name: 'publishedAtDate', type: 'string' },
            { name: 'placeId', type: 'string' },
            { name: 'cid', type: 'string' },
            { name: 'fid', type: 'string' },
            { name: 'totalScore', type: 'number' },
            { name: 'fid', type: 'string', validate: (value) => value === metadata.dataId }
        ];

        // Validate the reviews
        const { valid: validReviews } = array.validateArray(uniqueReviews, requiredFields);

        // Send for digestion
        const apiResponse = await sendForDigestion('google-maps-reviews', minerUID, validReviews);

        if(apiResponse?.status === 200){
            logger.info(`Google Maps Reviews - UID ${minerUID}: Sent for digestion successfully`);
        }
    }

}

export default prepareAndSendForDigestion
