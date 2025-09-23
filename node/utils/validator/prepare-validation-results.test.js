import prepareValidationResults from './prepare-validation-results.js';
import logger from '#modules/logger/index.js';

jest.mock('#modules/logger/index.js', () => ({
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
}));

describe('#utils/validator/prepare-validation-results.js', () => {
  beforeEach(() => {
    // Clear all mock calls before each test
    jest.clearAllMocks();
  });
  describe('baseValidationResult structure', () => {
    test('should have correct default structure', () => {
      // Test by calling the function with valid data and checking the base structure
      const result = prepareValidationResults('TestType', [['valid']], [1], [100], 120);

      expect(result[0]).toMatchObject({
        minerUID: 1,
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
        responseTime: 100,
      });
    });
  });

  describe('checkResponseValidity', () => {
    const typeName = 'TestType';
    const minerUID = 'miner1';

    test('should return valid for valid array response', () => {
      const responses = [['item1', 'item2']];
      const result = prepareValidationResults(typeName, responses, [minerUID], [100], 120);

      expect(result[0].validationError).toBeUndefined();
      expect(logger.error).not.toHaveBeenCalled();
    });

    test('should return invalid for null response', () => {
      const responses = [undefined];
      const result = prepareValidationResults(typeName, responses, [minerUID], [100], 120);

      expect(result[0].validationError).toBe('Response is not an array');
      expect(logger.error).toHaveBeenCalledWith(
        `${typeName} - UID ${minerUID}: Invalid response - not an array`
      );
    });

    test('should return invalid for undefined response', () => {
      const responses = [undefined];
      const result = prepareValidationResults(typeName, responses, [minerUID], [100], 120);

      expect(result[0].validationError).toBe('Response is not an array');
      expect(logger.error).toHaveBeenCalledWith(
        `${typeName} - UID ${minerUID}: Invalid response - not an array`
      );
    });

    test('should return invalid for non-array response (string)', () => {
      const responses = ['not an array'];
      const result = prepareValidationResults(typeName, responses, [minerUID], [100], 120);

      expect(result[0].validationError).toBe('Response is not an array');
      expect(logger.error).toHaveBeenCalledWith(
        `${typeName} - UID ${minerUID}: Invalid response - not an array`
      );
    });

    test('should return invalid for non-array response (object)', () => {
      const responses = [{ key: 'value' }];
      const result = prepareValidationResults(typeName, responses, [minerUID], [100], 120);

      expect(result[0].validationError).toBe('Response is not an array');
      expect(logger.error).toHaveBeenCalledWith(
        `${typeName} - UID ${minerUID}: Invalid response - not an array`
      );
    });

    test('should return invalid for non-array response (number)', () => {
      const responses = [123];
      const result = prepareValidationResults(typeName, responses, [minerUID], [100], 120);

      expect(result[0].validationError).toBe('Response is not an array');
      expect(logger.error).toHaveBeenCalledWith(
        `${typeName} - UID ${minerUID}: Invalid response - not an array`
      );
    });

    test('should return invalid for empty array response', () => {
      const responses = [[]];
      const result = prepareValidationResults(typeName, responses, [minerUID], [100], 120);

      expect(result[0].validationError).toBe('Response is empty');
      expect(logger.error).toHaveBeenCalledWith(
        `${typeName} - UID ${minerUID}: Response is empty`
      );
    });
  });

  describe('createValidationResult', () => {
    test('should merge parameters with base validation result', () => {
      // Test via prepareValidationResults which uses createValidationResult internally
      const result = prepareValidationResults('TestType', [['valid']], ['custom-miner'], [500], 120);

      expect(result[0]).toMatchObject({
        minerUID: 'custom-miner',
        responseTime: 500,
        passedValidation: false,
        count: 0, // from baseValidationResult
        mostRecentDate: undefined, // from baseValidationResult
        data: [], // from baseValidationResult
        components: {
          speedScore: 0,
          volumeScore: 0,
          recencyScore: 0
        }
      });
    });

    test('should override base validation result properties', () => {
      // Since we can't directly call createValidationResult, we test through prepareValidationResults
      const result = prepareValidationResults('TestType', [['valid']], ['test-uid'], [200], 120);

      expect(result[0].minerUID).toBe('test-uid');
      expect(result[0].responseTime).toBe(200);
    });
  });

  describe('prepareValidationResults', () => {
    const typeName = 'TestType';
    const synapseTimeout = 120;

    test('should process single valid response correctly', () => {
      const responses = [['item1', 'item2']];
      const minerUIDs = ['miner1'];
      const responseTimes = [50];

      const result = prepareValidationResults(typeName, responses, minerUIDs, responseTimes, synapseTimeout);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        minerUID: 'miner1',
        responseTime: 50,
        validationError: undefined
      });
    });

    test('should process multiple responses correctly', () => {
      const responses = [['item1'], ['item2', 'item3'], []];
      const minerUIDs = ['miner1', 'miner2', 'miner3'];
      const responseTimes = [30, 40, 50];

      const result = prepareValidationResults(typeName, responses, minerUIDs, responseTimes, synapseTimeout);

      expect(result).toHaveLength(3);

      // First response - valid
      expect(result[0]).toMatchObject({
        minerUID: 'miner1',
        responseTime: 30,
        validationError: undefined
      });

      // Second response - valid
      expect(result[1]).toMatchObject({
        minerUID: 'miner2',
        responseTime: 40,
        validationError: undefined
      });

      // Third response - invalid (empty array)
      expect(result[2]).toMatchObject({
        minerUID: 'miner3',
        responseTime: 50,
        validationError: 'Response is empty'
      });
    });

    test('should use index as minerUID when minerUIDs array is shorter', () => {
      const responses = [['item1'], ['item2']];
      const minerUIDs = ['miner1']; // Only one UID for two responses
      const responseTimes = [30, 40];

      const result = prepareValidationResults(typeName, responses, minerUIDs, responseTimes, synapseTimeout);

      expect(result).toHaveLength(2);
      expect(result[0].minerUID).toBe('miner1');
      expect(result[1].minerUID).toBe(1); // Uses index as fallback
    });

    test('should use synapseTimeout when responseTimes array is shorter', () => {
      const responses = [['item1'], ['item2']];
      const minerUIDs = ['miner1', 'miner2'];
      const responseTimes = [30]; // Only one response time for two responses

      const result = prepareValidationResults(typeName, responses, minerUIDs, responseTimes, synapseTimeout);

      expect(result).toHaveLength(2);
      expect(result[0].responseTime).toBe(30);
      expect(result[1].responseTime).toBe(synapseTimeout); // Uses synapseTimeout as fallback
    });

    test('should use index as minerUID when minerUIDs is empty', () => {
      const responses = [['item1'], ['item2']];
      const minerUIDs = [];
      const responseTimes = [30, 40];

      const result = prepareValidationResults(typeName, responses, minerUIDs, responseTimes, synapseTimeout);

      expect(result).toHaveLength(2);
      expect(result[0].minerUID).toBe(0);
      expect(result[1].minerUID).toBe(1);
    });

    test('should use synapseTimeout when responseTimes is empty', () => {
      const responses = [['item1'], ['item2']];
      const minerUIDs = ['miner1', 'miner2'];
      const responseTimes = [];

      const result = prepareValidationResults(typeName, responses, minerUIDs, responseTimes, synapseTimeout);

      expect(result).toHaveLength(2);
      expect(result[0].responseTime).toBe(synapseTimeout);
      expect(result[1].responseTime).toBe(synapseTimeout);
    });

    test('should handle mixed valid and invalid responses', () => {
      const responses = [
        ['valid1'],
        undefined,
        [],
        'not-array',
        ['valid2', 'valid3']
      ];
      const minerUIDs = ['miner1', 'miner2', 'miner3', 'miner4', 'miner5'];
      const responseTimes = [10, 20, 30, 40, 50];

      const result = prepareValidationResults(typeName, responses, minerUIDs, responseTimes, synapseTimeout);

      expect(result).toHaveLength(5);

      // Valid responses
      expect(result[0].validationError).toBeUndefined();
      expect(result[4].validationError).toBeUndefined();

      // Invalid responses
      expect(result[1].validationError).toBe('Response is not an array');
      expect(result[2].validationError).toBe('Response is empty');
      expect(result[3].validationError).toBe('Response is not an array');

      // Check logger calls
      expect(logger.error).toHaveBeenCalledTimes(3);
      expect(logger.error).toHaveBeenCalledWith(`${typeName} - UID miner2: Invalid response - not an array`);
      expect(logger.error).toHaveBeenCalledWith(`${typeName} - UID miner3: Response is empty`);
      expect(logger.error).toHaveBeenCalledWith(`${typeName} - UID miner4: Invalid response - not an array`);
    });

    test('should handle empty responses array', () => {
      const result = prepareValidationResults(typeName, [], [], [], synapseTimeout);

      expect(result).toHaveLength(0);
      expect(logger.error).not.toHaveBeenCalled();
    });

    test('should preserve all base validation result properties', () => {
      const responses = [['valid']];
      const minerUIDs = ['test-miner'];
      const responseTimes = [100];

      const result = prepareValidationResults(typeName, responses, minerUIDs, responseTimes, synapseTimeout);

      expect(result[0]).toEqual({
        minerUID: 'test-miner',
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
        responseTime: 100,
      });
    });

    test('should handle boolean false response as invalid', () => {
      const responses = [false];
      const minerUIDs = ['miner1'];
      const responseTimes = [100];

      const result = prepareValidationResults(typeName, responses, minerUIDs, responseTimes, synapseTimeout);

      expect(result[0].validationError).toBe('Response is not an array');
      expect(logger.error).toHaveBeenCalledWith(`${typeName} - UID miner1: Invalid response - not an array`);
    });

    test('should handle zero as invalid response', () => {
      const responses = [0];
      const minerUIDs = ['miner1'];
      const responseTimes = [100];

      const result = prepareValidationResults(typeName, responses, minerUIDs, responseTimes, synapseTimeout);

      expect(result[0].validationError).toBe('Response is not an array');
      expect(logger.error).toHaveBeenCalledWith(`${typeName} - UID miner1: Invalid response - not an array`);
    });
  });
});
