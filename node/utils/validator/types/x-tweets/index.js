import createSyntheticTask from './create-synthetic/index.js';
import score from './score/index.js';
import prepareAndSendForDigestion from './score/prepare-and-send-for-digestion.js';

export default {
    id: 'x-tweets',
    name: 'X Tweets',
    createSyntheticTask,
    score,
    prepareAndSendForDigestion
}

