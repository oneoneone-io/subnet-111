import config from '#config';
import responseService from '#modules/response/index.js';

/**
 * Output the health of the validator node
 * @returns {Object} - The output
 */
const output = () => {
  return {
    status: 'healthy',
    node: 'validator',
    endpoints: ['/create-synthetic-task', '/score-responses', '/health'],
    config: {
      google_reviews_synapse_params: config.VALIDATOR.GOOGLE_REVIEWS_SYNAPSE_PARAMS
    }
  }
}

/**
 * Execute the health route
 * @param {Object} request - The request object
 * @param {Object} response - The response object
 * @returns {Object} - The output
 */
const execute = (request, response) => {
  return responseService.success(response, output());
}

export default {
  execute,
  output
}
