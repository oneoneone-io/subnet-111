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
  let validationData;
  let responseTimes;
  const synapseTimeout = 120;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup base test data
    validationData = [
      {
        minerUID: 'miner1',
        passedValidation: true,
        count: 100,
        mostRecentDate: new Date('2024-03-20T10:00:00Z')
      },
      {
        minerUID: 'miner2',
        passedValidation: true,
        count: 50,
        mostRecentDate: new Date('2024-03-19T10:00:00Z')
      }
    ];

    responseTimes = [10, 20];

    // Mock time utility functions
    time.getMostRecentDate.mockReturnValue(new Date('2024-03-20T10:00:00Z'));
    time.getOldestDate.mockReturnValue(new Date('2024-03-19T10:00:00Z'));
  });

  test('should calculate scores correctly for valid results', () => {
    const result = calculateFinalScores(validationData, responseTimes);

    expect(result.scores).toHaveLength(2);
    expect(result.meanScore).toBeDefined();
    expect(result.minScore).toBeDefined();
    expect(result.maxScore).toBeDefined();
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
    validationData[0].passedValidation = false;
    validationData[0].validationError = 'Test error';

    const result = calculateFinalScores(validationData, responseTimes, synapseTimeout);

    expect(result.finalScores[0].score).toBe(0);
    expect(result.finalScores[0].validationError).toBe('Test error');
    expect(result.finalScores[0].components.speedScore).toBe(0);
    expect(result.finalScores[0].components.volumeScore).toBe(0);
    expect(result.finalScores[0].components.recencyScore).toBe(0);
  });

  test('should handle timeout responses', () => {
    responseTimes[0] = synapseTimeout;

    const result = calculateFinalScores(validationData, responseTimes, synapseTimeout);

    expect(result.finalScores[0].score).toBe(0);
    expect(result.finalScores[0].validationError).toContain('Response timeout');
    expect(result.finalScores[0].components.speedScore).toBe(0);
    expect(result.finalScores[0].components.volumeScore).toBe(0);
    expect(result.finalScores[0].components.recencyScore).toBe(0);
  });

  test('should handle no valid results', () => {
    validationData = validationData.map(data => ({
      ...data,
      passedValidation: false,
    }));

    const result = calculateFinalScores(validationData, responseTimes, synapseTimeout);

    expect(result.finalScores).toHaveLength(2);
    expect(result.finalScores[0].score).toBe(0);
    expect(result.finalScores[1].score).toBe(0);
    expect(result.finalScores[0].validationError).toBe('No valid responses');
    expect(result.finalScores[1].validationError).toBe('No valid responses');
    expect(result.scores).toEqual([0, 0]);
    expect(result.meanScore).toBe(0);
    expect(result.minScore).toBe(0);
    expect(result.maxScore).toBe(0);
    expect(logger.warning).toHaveBeenCalledWith('No valid results to score');
  });

  test('should handle same dates for all miners', () => {
    validationData = validationData.map(data => ({
      ...data,
      mostRecentDate: new Date('2024-03-20T10:00:00Z')
    }));

    time.getMostRecentDate.mockReturnValue(new Date('2024-03-20T10:00:00Z'));
    time.getOldestDate.mockReturnValue(new Date('2024-03-20T10:00:00Z'));

    const result = calculateFinalScores(validationData, responseTimes, synapseTimeout);

    // Both miners should get full recency score since they have the same date
    expect(result.finalScores[0].components.recencyScore).toBe(1);
    expect(result.finalScores[1].components.recencyScore).toBe(1);
  });

  test('should handle missing response times', () => {
    responseTimes = [10]; // Only provide time for first miner

    const result = calculateFinalScores(validationData, responseTimes, synapseTimeout);

    expect(result.finalScores[1].score).toBe(0);
    expect(result.finalScores[1].validationError).toContain('Response timeout');
  });

  test('should handle undefined dates', () => {
    validationData[0].mostRecentDate = undefined;

    const result = calculateFinalScores(validationData, responseTimes, synapseTimeout);

    expect(result.finalScores[0].components.recencyScore).toBe(0);
  });

  test('should handle undefined count and response time', () => {
    validationData = validationData.map((data) => ({
      ...data,
      count: undefined,
      responseTime: undefined
    }))

    validationData[0].passedValidation = false;
    validationData[0].responseTime = 0;

    validationData[1].passedValidation = true;
    validationData[1].responseTime = 0;

    const result = calculateFinalScores(validationData, responseTimes, synapseTimeout);

    expect(result.finalScores[0].components.recencyScore).toBe(0);
  });

  test('should handle non existent date range', () => {
    time.getMostRecentDate.mockReturnValue(false);
    time.getOldestDate.mockReturnValue(false);

    const result = calculateFinalScores(validationData, responseTimes, synapseTimeout);

    expect(result.finalScores[0].components.recencyScore).toBe(1);
    expect(result.finalScores[1].components.recencyScore).toBe(1);
  });
});
