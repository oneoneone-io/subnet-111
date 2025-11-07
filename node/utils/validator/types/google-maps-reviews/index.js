import createSyntheticTask from './create-synthetic/index.js';
import score from './score/index.js';
import prepareAndSendForDigestion from './score/prepare-and-send-for-digestion.js';
import getS3Identifier from './score/get-s3-identifier.js';

export default {
    id: 'google-maps-reviews', // This is for the synthetic task type id
    name: 'Google Maps Reviews', // This is the name of the validator type
    s3: {
        idField: 'reviewId',
        stripFields: ['reviewId', 'reviewUrl', 'placeId', 'cid', 'fid', 'url'],
        getS3Identifier,
    },
    createSyntheticTask, // This is the function that creates the synthetic task metadata
    score, // This is the function that scores the synthetic task
    prepareAndSendForDigestion // This is the function that prepares and sends the data for digestion
}
