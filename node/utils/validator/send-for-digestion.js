import logger from '#modules/logger/index.js';
import fetch from 'node-fetch';

const DIGESTION_API_URL = 'https://oneoneone.io/api/digest';

/**
 * Send data for digestion
 * @param {string} type - The type of data to send
 * @param {string} minerUID - The UID of the miner
 * @param {Array} data - The data to send
 */
const sendForDigestion = async (type, minerUID, data) => {
    if(!process.env.PLATFORM_TOKEN){
        logger.error('Platform token is not set. Skipping digestion request');
        return;
    }

    let response;
    try {
        response = await fetch(DIGESTION_API_URL, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.PLATFORM_TOKEN}`
            },
            body: JSON.stringify({
                type,
                miner_uid: minerUID,
                data,
            })
        })
    } catch (error) {
        logger.error(`Error sending for digestion: ${error}`);
    }
    
    return response;
}

export default sendForDigestion
