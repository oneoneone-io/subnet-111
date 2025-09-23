import {
  createEmptyValidationResult,
  createValidationResult,
  prepareValidationResults
} from './validation-result.js';

describe('#utils/validator/validation-result.js', () => {
  describe('createValidationResult', () => {
    test('should create validation result with default values when no parameters provided', () => {
      const result = createValidationResult();

      expect(result).toEqual({
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
      });
    });

    test('should create validation result with provided parameters', () => {
      const parameters = {
        minerUID: 123,
        passedValidation: true,
        validationError: undefined,
        count: 5,
        mostRecentDate: '2023-12-01',
        data: ['item1', 'item2'],
        components: {
          speedScore: 85,
          volumeScore: 92,
          recencyScore: 78
        },
        responseTime: 250,
        score: 0.8
      };

      const result = createValidationResult(parameters);

      expect(result).toEqual(parameters);
    });

    test('should override default values with provided parameters', () => {
      const parameters = {
        minerUID: 456,
        passedValidation: true,
        count: 10
      };

      const result = createValidationResult(parameters);

      expect(result.minerUID).toBe(456);
      expect(result.passedValidation).toBe(true);
      expect(result.count).toBe(10);
      // Should keep default values for non-provided parameters
      expect(result.validationError).toBeUndefined();
      expect(result.data).toEqual([]);
      expect(result.components.speedScore).toBe(0);
    });

    test('should handle empty object parameter', () => {
      const result = createValidationResult({});

      expect(result).toEqual({
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
      });
    });
  });

  describe('createEmptyValidationResult', () => {
    test('should create empty validation result with required parameters', () => {
      const parameters = {
        minerUID: 789,
        responseTime: 300
      };

      const result = createEmptyValidationResult(parameters);

      expect(result).toEqual({
        minerUID: 789,
        passedValidation: false,
        validationError: 'No valid responses',
        count: 0,
        mostRecentDate: undefined,
        data: [],
        components: {
          speedScore: 0,
          volumeScore: 0,
          recencyScore: 0
        },
        responseTime: 300,
        score: 0
      });
    });

    test('should create empty validation result with custom validation error', () => {
      const parameters = {
        minerUID: 101,
        responseTime: 150,
        validationError: 'Custom error message'
      };

      const result = createEmptyValidationResult(parameters);

      expect(result.minerUID).toBe(101);
      expect(result.responseTime).toBe(150);
      expect(result.validationError).toBe('Custom error message');
      expect(result.passedValidation).toBe(false);
      expect(result.score).toBe(0);
      expect(result.count).toBe(0);
    });

    test('should use default validation error when not provided', () => {
      const parameters = {
        minerUID: 202,
        responseTime: 400
      };

      const result = createEmptyValidationResult(parameters);

      expect(result.validationError).toBe('No valid responses');
    });

    test('should handle undefined responseTime', () => {
      const parameters = {
        minerUID: 303,
        responseTime: undefined
      };

      const result = createEmptyValidationResult(parameters);

      expect(result.responseTime).toBeUndefined();
      expect(result.minerUID).toBe(303);
    });
  });

  describe('prepareValidationResults', () => {
    test('should prepare validation results for multiple responses', () => {
      const responses = ['response1', 'response2', 'response3'];
      const minerUIDs = [100, 200, 300];
      const responseTimes = [150, 250, 350];
      const metadata = { task: 'test', location: 'NY' };
      const typeId = 'google-maps-reviews';

      const results = prepareValidationResults(responses, minerUIDs, responseTimes, metadata, typeId);

      expect(results).toHaveLength(3);

      for (const [index, result] of results.entries()) {
        expect(result.minerUID).toBe(minerUIDs[index]);
        expect(result.responseTime).toBe(responseTimes[index]);
        expect(result.metadata).toEqual(metadata);
        expect(result.typeId).toBe(typeId);
        expect(result.passedValidation).toBe(false);
        expect(result.count).toBe(0);
        expect(result.data).toEqual([]);
      }
    });

    test('should use index as minerUID when minerUIDs array is shorter', () => {
      const responses = ['response1', 'response2', 'response3'];
      const minerUIDs = [100]; // Only one UID provided
      const responseTimes = [150, 250, 350];
      const metadata = { task: 'test' };
      const typeId = 'test-type';

      const results = prepareValidationResults(responses, minerUIDs, responseTimes, metadata, typeId);

      expect(results).toHaveLength(3);
      expect(results[0].minerUID).toBe(100); // From minerUIDs array
      expect(results[1].minerUID).toBe(1); // Uses index
      expect(results[2].minerUID).toBe(2); // Uses index
    });

    test('should handle empty minerUIDs array', () => {
      const responses = ['response1', 'response2'];
      const minerUIDs = [];
      const responseTimes = [150, 250];
      const metadata = { task: 'test' };
      const typeId = 'test-type';

      const results = prepareValidationResults(responses, minerUIDs, responseTimes, metadata, typeId);

      expect(results).toHaveLength(2);
      expect(results[0].minerUID).toBe(0); // Uses index
      expect(results[1].minerUID).toBe(1); // Uses index
    });

    test('should handle undefined values in responseTimes', () => {
      const responses = ['response1', 'response2'];
      const minerUIDs = [100, 200];
      const responseTimes = [150, undefined];
      const metadata = { task: 'test' };
      const typeId = 'test-type';

      const results = prepareValidationResults(responses, minerUIDs, responseTimes, metadata, typeId);

      expect(results).toHaveLength(2);
      expect(results[0].responseTime).toBe(150);
      expect(results[1].responseTime).toBeUndefined();
    });

    test('should handle empty responses array', () => {
      const responses = [];
      const minerUIDs = [];
      const responseTimes = [];
      const metadata = { task: 'test' };
      const typeId = 'test-type';

      const results = prepareValidationResults(responses, minerUIDs, responseTimes, metadata, typeId);

      expect(results).toHaveLength(0);
      expect(results).toEqual([]);
    });

    test('should handle single response', () => {
      const responses = ['single-response'];
      const minerUIDs = [999];
      const responseTimes = [75];
      const metadata = { single: true };
      const typeId = 'single-type';

      const results = prepareValidationResults(responses, minerUIDs, responseTimes, metadata, typeId);

      expect(results).toHaveLength(1);
      expect(results[0].minerUID).toBe(999);
      expect(results[0].responseTime).toBe(75);
      expect(results[0].metadata).toEqual({ single: true });
      expect(results[0].typeId).toBe('single-type');
    });

    test('should preserve all default validation result properties', () => {
      const responses = ['test-response'];
      const minerUIDs = [123];
      const responseTimes = [200];
      const metadata = { test: true };
      const typeId = 'test';

      const results = prepareValidationResults(responses, minerUIDs, responseTimes, metadata, typeId);

      expect(results[0]).toEqual({
        minerUID: 123,
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
        responseTime: 200,
        metadata: { test: true },
        typeId: 'test'
      });
    });
  });
});
