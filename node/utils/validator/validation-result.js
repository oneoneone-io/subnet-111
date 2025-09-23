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
 * Create a validation result
 * @param {Object} parameters - The parameters for the validation result
 * @returns {Object} - The validation result
 */
const createEmptyValidationResult = ({
  minerUID,
  responseTime,
  validationError = 'No valid responses',
}) => {
  return  createValidationResult({ 
    minerUID,
    score: 0,
    components: {
      speedScore: 0,
      volumeScore: 0,
      recencyScore: 0
    },
    passedValidation: false,
    validationError,
    responseTime: responseTime,
    count: 0
  })
}

/**
 * Goes through all responses and creates a validation result for each response
 * @param {Array} responses - The responses to prepare
 * @param {Array} minerUIDs - The miner UIDs
 * @param {Array} responseTimes - The response times
 * @param {Object} metadata - The metadata
 * @param {String} typeId - The type ID
 * @returns {Array} - Array of validation results
 */
const prepareValidationResults = (responses, minerUIDs, responseTimes, metadata, typeId) => {
  const validationResults = [];

  for(let index = 0; index < responses.length; index++) {
    const minerUID = minerUIDs[index] || index;
    const responseTime = responseTimes[index];
    const validationResult = createValidationResult({
      minerUID,
      responseTime,
      metadata,
      typeId
    });

    validationResults.push(validationResult);
  }

  return validationResults;
}

export {
  createEmptyValidationResult,
  createValidationResult,
  prepareValidationResults
}
