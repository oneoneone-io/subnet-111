import calculateFinalScores from './calculate-final-scores.js';
import logger from '#modules/logger/index.js';
import time from '#modules/time/index.js';

jest.mock('#modules/logger/index.js', () => ({
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
}));

jest.mock('#modules/time/index.js', () => ({
  getMostRecentDate: jest.fn(),
  getOldestDate: jest.fn(),
}));

describe('#utils/validator/google-maps/score/calculate-final-scores.js', () => {
  let validationResults;
  const synapseTimeout = 120;
  const selectedType = {
    name: 'TestType',
    scoreConstants: {
      SPEED: 0.3,
      VOLUME: 0.5,
      RECENCY: 0.2
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup base test data with correct structure for new function signature
    validationResults = [
      {
        minerUID: 'miner1',
        passedValidation: true,
        count: 100,
        mostRecentDate: new Date('2024-03-20T10:00:00Z'),
        responseTime: 10
      },
      {
        minerUID: 'miner2',
        passedValidation: true,
        count: 50,
        mostRecentDate: new Date('2024-03-19T10:00:00Z'),
        responseTime: 20
      }
    ];

    // Mock time utility functions
    time.getMostRecentDate.mockReturnValue(new Date('2024-03-20T10:00:00Z'));
    time.getOldestDate.mockReturnValue(new Date('2024-03-19T10:00:00Z'));
  });

  test('should calculate scores correctly for valid results', () => {
    const result = calculateFinalScores(selectedType, validationResults, synapseTimeout);

    expect(result.statistics.count).toBe(2);
    expect(result.statistics.mean).toBeDefined();
    expect(result.statistics.min).toBeDefined();
    expect(result.statistics.max).toBeDefined();
    expect(result.finalScores).toHaveLength(2);

    // Check first miner's scores
    const miner1Score = result.finalScores[0];
    expect(miner1Score.minerUID).toBe('miner1');
    expect(miner1Score.components.speedScore).toBe(1); // 10/10 = 1
    expect(miner1Score.components.volumeScore).toBe(1); // 100/100 = 1
    expect(miner1Score.components.recencyScore).toBe(1); // Most recent date
    expect(miner1Score.score).toBe(1); // Perfect score

    // Check second miner's scores
    const miner2Score = result.finalScores[1];
    expect(miner2Score.minerUID).toBe('miner2');
    expect(miner2Score.components.speedScore).toBe(0.5); // 10/20 = 0.5
    expect(miner2Score.components.volumeScore).toBe(0.5); // 50/100 = 0.5
    expect(miner2Score.components.recencyScore).toBe(0); // Oldest date
    expect(miner2Score.score).toBe(0.4); // (0.3 * 0.5) + (0.5 * 0.5) + (0.2 * 0)
  });

  test('should handle validation failures', () => {
    validationResults[0].passedValidation = false;
    validationResults[0].validationError = 'Test error';

    const result = calculateFinalScores(selectedType, validationResults, synapseTimeout);

    expect(result.finalScores[0].score).toBe(0);
    expect(result.finalScores[0].validationError).toBe('Test error');
    expect(result.finalScores[0].components.speedScore).toBe(0);
    expect(result.finalScores[0].components.volumeScore).toBe(0);
    expect(result.finalScores[0].components.recencyScore).toBe(0);
  });

  test('should handle timeout responses', () => {
    validationResults[0].responseTime = synapseTimeout;

    const result = calculateFinalScores(selectedType, validationResults, synapseTimeout);

    expect(result.finalScores[0].score).toBe(0);
    expect(result.finalScores[0].validationError).toContain('Response timeout');
    expect(result.finalScores[0].components.speedScore).toBe(0);
    expect(result.finalScores[0].components.volumeScore).toBe(0);
    expect(result.finalScores[0].components.recencyScore).toBe(0);
  });

  test('should handle no valid results', () => {
    validationResults = validationResults.map(data => ({
      ...data,
      passedValidation: false,
    }));

    const result = calculateFinalScores(selectedType, validationResults, synapseTimeout);

    expect(result.finalScores).toHaveLength(2);
    expect(result.finalScores[0].score).toBe(0);
    expect(result.finalScores[1].score).toBe(0);
    expect(result.finalScores[0].validationError).toBe('No valid responses');
    expect(result.finalScores[1].validationError).toBe('No valid responses');
    expect(result.statistics.count).toBe(2);
    expect(result.statistics.mean).toBe(0);
    expect(result.statistics.min).toBe(0);
    expect(result.statistics.max).toBe(0);
    expect(logger.warning).toHaveBeenCalledWith(`${selectedType.name} - No valid results to score`);
  });

  test('should handle same dates for all miners', () => {
    validationResults = validationResults.map(data => ({
      ...data,
      mostRecentDate: new Date('2024-03-20T10:00:00Z')
    }));

    time.getMostRecentDate.mockReturnValue(new Date('2024-03-20T10:00:00Z'));
    time.getOldestDate.mockReturnValue(new Date('2024-03-20T10:00:00Z'));

    const result = calculateFinalScores(selectedType, validationResults, synapseTimeout);

    // Both miners should get full recency score since they have the same date
    expect(result.finalScores[0].components.recencyScore).toBe(1);
    expect(result.finalScores[1].components.recencyScore).toBe(1);
  });

  test('should handle response time timeout for individual miners', () => {
    validationResults[1].responseTime = synapseTimeout; // Second miner times out

    const result = calculateFinalScores(selectedType, validationResults, synapseTimeout);

    expect(result.finalScores[1].score).toBe(0);
    expect(result.finalScores[1].validationError).toContain('Response timeout');
  });

  test('should handle undefined dates', () => {
    validationResults[0].mostRecentDate = undefined;

    const result = calculateFinalScores(selectedType, validationResults, synapseTimeout);

    expect(result.finalScores[0].components.recencyScore).toBe(0);
  });

  test('should handle undefined count and response time', () => {
    validationResults = validationResults.map((data) => ({
      ...data,
      count: undefined,
    }))

    validationResults[0].passedValidation = false;
    validationResults[0].responseTime = 0;

    validationResults[1].passedValidation = true;
    validationResults[1].responseTime = 0;

    const result = calculateFinalScores(selectedType, validationResults, synapseTimeout);

    expect(result.finalScores[0].components.recencyScore).toBe(0);
  });

  test('should handle non existent date range', () => {
    time.getMostRecentDate.mockReturnValue(false);
    time.getOldestDate.mockReturnValue(false);

    const result = calculateFinalScores(selectedType, validationResults, synapseTimeout);

    // When date range is 0 but mostRecentDate exists, miners get full recency score
    expect(result.finalScores[0].components.recencyScore).toBe(1);
    expect(result.finalScores[1].components.recencyScore).toBe(1);
  });

  test('should handle empty validation results array', () => {
    const result = calculateFinalScores(selectedType, [], synapseTimeout);

    expect(result.finalScores).toHaveLength(0);
    expect(result.statistics.count).toBe(0);
    expect(result.statistics.mean).toBe(0);
    expect(result.statistics.min).toBe(0);
    expect(result.statistics.max).toBe(0);
  });

  test('should handle miners with zero response time', () => {
    validationResults[0].responseTime = 0;

    const result = calculateFinalScores(selectedType, validationResults, synapseTimeout);

    expect(result.finalScores[0].components.speedScore).toBe(0);
  });

  test('should handle miners with zero count', () => {
    validationResults[0].count = 0;

    const result = calculateFinalScores(selectedType, validationResults, synapseTimeout);

    expect(result.finalScores[0].components.volumeScore).toBe(0);
  });

  test('should use default synapseTimeout of 120 when not provided', () => {
    // Set one miner to exactly 120 seconds (should timeout with default)
    validationResults[0].responseTime = 120;
    // Set another to just under 120 (should pass with default)
    validationResults[1].responseTime = 119;

    // Call without synapseTimeout parameter to test default value
    const result = calculateFinalScores(selectedType, validationResults);

    // First miner should timeout (responseTime >= 120)
    expect(result.finalScores[0].score).toBe(0);
    expect(result.finalScores[0].validationError).toContain('Response timeout');
    expect(result.finalScores[0].components.speedScore).toBe(0);
    expect(result.finalScores[0].components.volumeScore).toBe(0);
    expect(result.finalScores[0].components.recencyScore).toBe(0);

    // Second miner should pass (responseTime < 120)
    expect(result.finalScores[1].score).toBeGreaterThan(0);
    expect(result.finalScores[1].passedValidation).toBe(true);
  });

  test('should handle validation error without specific error message', () => {
    const validationResults = [
      {
        minerUID: 'miner1',
        passedValidation: false,
        responseTime: 50, // Less than timeout
        validationError: undefined, // No specific error
        count: 5,
        mostRecentDate: new Date('2024-01-01')
      }
    ];

    const result = calculateFinalScores(selectedType, validationResults, 120);

    expect(result.finalScores[0].validationError).toBe('No valid responses');
    expect(result.finalScores[0].score).toBe(0);
  });

  test('should handle zero response time and count for speed score', () => {
    const validationResults = [
      {
        minerUID: 'miner1',
        passedValidation: true,
        responseTime: 0, // Zero response time
        count: 0, // Zero count
        mostRecentDate: new Date('2024-01-01')
      }
    ];

    const result = calculateFinalScores(selectedType, validationResults, 120);

    expect(result.finalScores[0].components.speedScore).toBe(0);
  });

  test('should handle empty scores array for statistics', () => {
    const validationResults = [
      {
        minerUID: 'miner1',
        passedValidation: false,
        responseTime: 1000,
        validationError: 'Failed validation',
        count: 0,
        mostRecentDate: undefined
      }
    ];

    const result = calculateFinalScores(selectedType, validationResults, 120);

    // The statistics.count is the length of the finalScores array, not the count of valid scores
    expect(result.statistics.count).toBe(1); // One final score entry
    expect(result.statistics.mean).toBe(0);
    expect(result.statistics.min).toBe(0);
    expect(result.statistics.max).toBe(0);
  });
});
