const baseValidationResult = {
  minerUID: undefined,
  passedValidation: false,
  validationError: undefined,
  count: 0,
  mostRecentDate: undefined,
  data: [],
  components: {
    speedScore: 0,
    volumeScore: 0,
    recencyScore: 0
  },
  responseTime: undefined,
};

/**
 * Check the validity of a response
 * @param {Array} response - The response to check
 * @param {string} minerUID - The UID of the miner
 * @returns {Object} - The validity of the response
 */
const checkResponseValidity = (typeName, response, minerUID) => {
  let isValid = true;
  let validationError;

  // Handle invalid responses
  if (!response || !Array.isArray(response)) {
    logger.error(`${typeName} - UID ${minerUID}: Invalid response - not an array`);
    isValid = false;
    validationError = 'Response is not an array';
  } else if (response.length === 0) {
    logger.error(`${typeName} - UID ${minerUID}: Response is empty`);
    isValid = false;
    validationError = 'Response is empty';
  }

  return { isValid, validationError }
}

/**
 * Create a validation result
 * @param {Object} parameters - The parameters for the validation result
 * @returns {Object} - The validation result
 */
const createValidationResult = (parameters) => {
  return {
    ...baseValidationResult,
    ...parameters
  }
}

/**
 * Goes through all responses and creates a validation result for each response
 * @param {Array} responses - The responses to prepare
 * @param {Array} minerUIDs - The miner UIDs
 * @param {Array} responseTimes - The response times
 * @param {Number} synapseTimeout - The synapse timeout
 * @returns {Array} - Array of validation results
 */
const prepareValidationResults = (
  typeName,
  responses,
  minerUIDs,
  responseTimes,
  synapseTimeout
) => {
  const validationResults = responses.map((response, index) => {

    // Get the miner UID and response time
    const minerUID = minerUIDs[index] || index;
    const responseTime = responseTimes[index] || synapseTimeout;

    // Check if the response object is valid
    const { isValid, validationError } = checkResponseValidity(typeName, response, minerUID);
    const validationResult = createValidationResult({ minerUID, responseTime });

    if (!isValid) {
      validationResult.validationError = validationError;
    }

    return validationResult;
  });

  return validationResults;
}

export default prepareValidationResults
