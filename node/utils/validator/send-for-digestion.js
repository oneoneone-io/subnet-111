import logger from '#modules/logger/index.js';
import retryFetch from '#modules/retry-fetch/index.js';

const DIGESTION_API_URL = 'https://oneoneone.io/api/digest';

/**
 * Send data for digestion
 * @param {string} type - The type of data to send
 * @param {string} minerUID - The UID of the miner
 * @param {Array} data - The data to send
 * @param {Object} metadata - The synapse metadata (keyword, name, etc.)
 */
const sendForDigestion = async (type, minerUID, data, metadata = {}) => {
    if(!process.env.PLATFORM_TOKEN){
        logger.error('Platform token is not set. Skipping digestion request');
        return;
    }

    let response;
    try {
        response = await retryFetch(DIGESTION_API_URL, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.PLATFORM_TOKEN}`
            },
            body: JSON.stringify({
                type,
                miner_uid: minerUID,
                keyword: metadata.keyword?.replaceAll(/^"|"$/g, ''),
                name: metadata.name,
                data,
            })
        })
    } catch (error) {
        logger.error(`Error sending for digestion: ${error}`);
    }

    return response;
}

export default sendForDigestion
