import sendForDigestion from '#utils/validator/send-for-digestion.js';
import array from '#modules/array/index.js';
import logger from '#modules/logger/index.js';

// eslint-disable-next-line no-unused-vars
const prepareAndSendForDigestion = async (responses, minerUIDs, metadata) => {
    for(const [index, response] of responses.entries()){
        const minerUID = minerUIDs[index] || index;

        // Data Cleaning - Remove duplicate tweets by tweetId
        const uniqueTweets = array.uniqueBy(response, 'tweetId');
        logger.info(`X Tweets - UID ${minerUID}: Data cleaning - ${response.length} tweets -> ${uniqueTweets.length} unique tweets`);

        // Structural Validation - Check required fields and types
        const requiredFields = [
            // Core required fields
            { name: 'tweetId', type: 'string' },
            { name: 'username', type: 'string' },
            { name: 'text', type: 'string' },
            { name: 'createdAt', type: 'string' },
            { name: 'tweetUrl', type: 'string' },
            { name: 'hashtags', type: 'object' },

            // Additional required fields from Gravity API
            { name: 'userId', type: 'string' },
            { name: 'displayName', type: 'string' },
            { name: 'followersCount', type: 'number' },
            { name: 'followingCount', type: 'number' },
            { name: 'verified', type: 'boolean' }
            // Note: userDescription is optional and not validated as it can be null
        ];

        // Validate the tweets
        const { valid: validTweets } = array.validateArray(uniqueTweets, requiredFields);

        // Send for digestion
        const apiResponse = await sendForDigestion('x-tweets', minerUID, validTweets);

        if(apiResponse?.status === 200){
            logger.info(`X Tweets - UID ${minerUID}: Sent for digestion successfully`);
        }
    }

}

export default prepareAndSendForDigestion

