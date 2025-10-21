import logger from '#modules/logger/index.js';
import { prepareResponses } from '#utils/validator/types/x-tweets/score/prepare-responses.js';
import performBatchSpotCheck from './perform-batch-spot-check.js';
import validateMinerAgainstBatch from './validate-miner-against-batch.js';
import score from './index.js';

jest.mock('#modules/logger/index.js', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

jest.mock('#utils/validator/types/x-tweets/score/prepare-responses.js', () => ({
  prepareResponses: jest.fn(),
}));

jest.mock('./perform-batch-spot-check.js');
jest.mock('./validate-miner-against-batch.js');

describe('#utils/validator/types/x-tweets/score/index.js', () => {
  let mockResponses;
  let mockMetadata;
  let mockResponseTimes;
  let mockSynapseTimeout;
  let mockMinerUIDs;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default test data
    mockResponses = [
      [{ tweetId: '1', text: 'Tweet 1' }],
      [{ tweetId: '2', text: 'Tweet 2' }],
      [{ tweetId: '3', text: 'Tweet 3' }]
    ];
    mockMetadata = { keyword: '"test-keyword"' };
    mockResponseTimes = [1000, 2000, 3000];
    mockSynapseTimeout = 120;
    mockMinerUIDs = ['miner1', 'miner2', 'miner3'];
  });

  describe('score function', () => {
    test('should return validation results when no miners have data', async () => {
      const mockValidationResults = [
        { minerUID: 'miner1', passedValidation: false, data: [], validationError: 'No data' },
        { minerUID: 'miner2', passedValidation: false, data: [], validationError: 'No data' },
        { minerUID: 'miner3', passedValidation: false, data: [], validationError: 'No data' }
      ];

      prepareResponses.mockReturnValue(mockValidationResults);

      const result = await score(mockResponses, mockMetadata, mockResponseTimes, mockSynapseTimeout, mockMinerUIDs, 'x-tweets');

      expect(prepareResponses).toHaveBeenCalledWith(
        mockResponses,
        mockMinerUIDs,
        mockResponseTimes,
        mockSynapseTimeout,
        mockMetadata,
        'x-tweets'
      );
      expect(performBatchSpotCheck).not.toHaveBeenCalled();
      expect(validateMinerAgainstBatch).not.toHaveBeenCalled();
      expect(result).toEqual(mockValidationResults);
    });

    test('should perform batch spot check when miners have valid data', async () => {
      const mockValidationResults = [
        {
          minerUID: 'miner1',
          passedValidation: true,
          data: [{ tweetId: '1', text: 'Tweet 1' }],
          count: 1,
          mostRecentDate: new Date('2024-03-20')
        },
        {
          minerUID: 'miner2',
          passedValidation: true,
          data: [{ tweetId: '2', text: 'Tweet 2' }],
          count: 1,
          mostRecentDate: new Date('2024-03-19')
        }
      ];

      const mockVerifiedTweetsMap = new Map([
        ['1', { id: '1', verified: true }],
        ['2', { id: '2', verified: true }]
      ]);

      prepareResponses.mockReturnValue(mockValidationResults);
      performBatchSpotCheck.mockResolvedValue(mockVerifiedTweetsMap);
      validateMinerAgainstBatch.mockReturnValue(true);

      const result = await score(mockResponses, mockMetadata, mockResponseTimes, mockSynapseTimeout, mockMinerUIDs);

      // Verify batch spot check was called with correct parameters
      expect(performBatchSpotCheck).toHaveBeenCalledWith([
        { minerUID: 'miner1', tweets: [{ tweetId: '1', text: 'Tweet 1' }] },
        { minerUID: 'miner2', tweets: [{ tweetId: '2', text: 'Tweet 2' }] }
      ], '"test-keyword"');

      // Verify validation was performed for each miner
      expect(validateMinerAgainstBatch).toHaveBeenCalledTimes(2);
      expect(validateMinerAgainstBatch).toHaveBeenCalledWith(
        [{ tweetId: '1', text: 'Tweet 1' }],
        '"test-keyword"',
        'miner1',
        mockVerifiedTweetsMap
      );
      expect(validateMinerAgainstBatch).toHaveBeenCalledWith(
        [{ tweetId: '2', text: 'Tweet 2' }],
        '"test-keyword"',
        'miner2',
        mockVerifiedTweetsMap
      );

      // Verify logging
      expect(logger.info).toHaveBeenCalledWith(
        'X Tweets - UID miner1: Validation complete - 1 tweets, most recent: 2024-03-20T00:00:00.000Z'
      );
      expect(logger.info).toHaveBeenCalledWith(
        'X Tweets - UID miner2: Validation complete - 1 tweets, most recent: 2024-03-19T00:00:00.000Z'
      );

      expect(result).toEqual(mockValidationResults);
    });

    test('should handle batch spot check failure and fail all miners with data', async () => {
      const mockValidationResults = [
        {
          minerUID: 'miner1',
          passedValidation: true,
          data: [{ tweetId: '1', text: 'Tweet 1' }],
          count: 1,
          mostRecentDate: new Date('2024-03-20')
        },
        {
          minerUID: 'miner2',
          passedValidation: false,
          data: [],
          validationError: 'No data'
        },
        {
          minerUID: 'miner3',
          passedValidation: true,
          data: [{ tweetId: '3', text: 'Tweet 3' }],
          count: 1,
          mostRecentDate: new Date('2024-03-18')
        }
      ];

      prepareResponses.mockReturnValue(mockValidationResults);
      performBatchSpotCheck.mockRejectedValue(new Error('Batch spot check failed'));

      const result = await score(mockResponses, mockMetadata, mockResponseTimes, mockSynapseTimeout, mockMinerUIDs);

      // Verify error logging
      expect(logger.error).toHaveBeenCalledWith(
        'X Tweets - Batch spot check failed:',
        expect.any(Error)
      );

      // Verify batch spot check was attempted
      expect(performBatchSpotCheck).toHaveBeenCalledWith([
        { minerUID: 'miner1', tweets: [{ tweetId: '1', text: 'Tweet 1' }] },
        { minerUID: 'miner3', tweets: [{ tweetId: '3', text: 'Tweet 3' }] }
      ], '"test-keyword"');

      // Verify validation against batch was not called
      expect(validateMinerAgainstBatch).not.toHaveBeenCalled();

      // Verify miners with data were failed
      expect(result[0].passedValidation).toBe(false);
      expect(result[0].validationError).toBe('Batch spot check failed');
      expect(result[1].passedValidation).toBe(false); // This one was already failed
      expect(result[2].passedValidation).toBe(false);
      expect(result[2].validationError).toBe('Batch spot check failed');
    });

    test('should handle individual miner validation failure', async () => {
      const mockValidationResults = [
        {
          minerUID: 'miner1',
          passedValidation: true,
          data: [{ tweetId: '1', text: 'Tweet 1' }],
          count: 1,
          mostRecentDate: new Date('2024-03-20')
        },
        {
          minerUID: 'miner2',
          passedValidation: true,
          data: [{ tweetId: '2', text: 'Tweet 2' }],
          count: 2,
          mostRecentDate: new Date('2024-03-19')
        }
      ];

      const mockVerifiedTweetsMap = new Map([
        ['1', { id: '1', verified: true }],
        ['2', { id: '2', verified: true }]
      ]);

      prepareResponses.mockReturnValue(mockValidationResults);
      performBatchSpotCheck.mockResolvedValue(mockVerifiedTweetsMap);
      validateMinerAgainstBatch
        .mockReturnValueOnce(true)  // miner1 passes
        .mockReturnValueOnce(false); // miner2 fails

      const result = await score(mockResponses, mockMetadata, mockResponseTimes, mockSynapseTimeout, mockMinerUIDs);

      // Verify validation was performed for both miners
      expect(validateMinerAgainstBatch).toHaveBeenCalledTimes(2);

      // Verify success logging for miner1
      expect(logger.info).toHaveBeenCalledWith(
        'X Tweets - UID miner1: Validation complete - 1 tweets, most recent: 2024-03-20T00:00:00.000Z'
      );

      // Verify failure logging for miner2
      expect(logger.error).toHaveBeenCalledWith(
        'X Tweets - UID miner2: Failed spot check validation'
      );

      // Verify results
      expect(result[0].passedValidation).toBe(true);
      expect(result[1].passedValidation).toBe(false);
      expect(result[1].validationError).toBe('Failed spot check verification');
      expect(result[1].count).toBe(0);
      expect(result[1].mostRecentDate).toBeUndefined();
    });

    test('should skip miners that already failed validation in prepareResponses', async () => {
      const mockValidationResults = [
        {
          minerUID: 'miner1',
          passedValidation: false,
          data: [],
          validationError: 'Structural validation failed'
        },
        {
          minerUID: 'miner2',
          passedValidation: true,
          data: [{ tweetId: '2', text: 'Tweet 2' }],
          count: 1,
          mostRecentDate: new Date('2024-03-19')
        }
      ];

      const mockVerifiedTweetsMap = new Map([
        ['2', { id: '2', verified: true }]
      ]);

      prepareResponses.mockReturnValue(mockValidationResults);
      performBatchSpotCheck.mockResolvedValue(mockVerifiedTweetsMap);
      validateMinerAgainstBatch.mockReturnValue(true);

      const result = await score(mockResponses, mockMetadata, mockResponseTimes, mockSynapseTimeout, mockMinerUIDs);

      // Verify batch spot check only includes valid miners
      expect(performBatchSpotCheck).toHaveBeenCalledWith([
        { minerUID: 'miner2', tweets: [{ tweetId: '2', text: 'Tweet 2' }] }
      ], '"test-keyword"');

      // Verify validation was only performed for valid miners
      expect(validateMinerAgainstBatch).toHaveBeenCalledTimes(1);
      expect(validateMinerAgainstBatch).toHaveBeenCalledWith(
        [{ tweetId: '2', text: 'Tweet 2' }],
        '"test-keyword"',
        'miner2',
        mockVerifiedTweetsMap
      );

      // Verify miner1 remained failed
      expect(result[0].passedValidation).toBe(false);
      expect(result[0].validationError).toBe('Structural validation failed');
      expect(result[1].passedValidation).toBe(true);
    });

    test('should handle empty selected spot check tweets gracefully', async () => {
      const mockValidationResults = [
        {
          minerUID: 'miner1',
          passedValidation: false,
          data: [],
          validationError: 'No valid data'
        },
        {
          minerUID: 'miner2',
          passedValidation: true,
          data: [], // No data for spot check
          count: 0
        }
      ];

      prepareResponses.mockReturnValue(mockValidationResults);

      const result = await score(mockResponses, mockMetadata, mockResponseTimes, mockSynapseTimeout, mockMinerUIDs);

      // Verify no batch spot check was performed
      expect(performBatchSpotCheck).not.toHaveBeenCalled();
      expect(validateMinerAgainstBatch).not.toHaveBeenCalled();

      expect(result).toEqual(mockValidationResults);
    });

    test('should handle mostRecentDate being undefined', async () => {
      const mockValidationResults = [
        {
          minerUID: 'miner1',
          passedValidation: true,
          data: [{ tweetId: '1', text: 'Tweet 1' }],
          count: 1,
          mostRecentDate: undefined // No date
        }
      ];

      const mockVerifiedTweetsMap = new Map([
        ['1', { id: '1', verified: true }]
      ]);

      prepareResponses.mockReturnValue(mockValidationResults);
      performBatchSpotCheck.mockResolvedValue(mockVerifiedTweetsMap);
      validateMinerAgainstBatch.mockReturnValue(true);

      const result = await score(mockResponses, mockMetadata, mockResponseTimes, mockSynapseTimeout, mockMinerUIDs);

      // Verify logging handles undefined date gracefully
      expect(logger.info).toHaveBeenCalledWith(
        'X Tweets - UID miner1: Validation complete - 1 tweets, most recent: undefined'
      );

      expect(result[0].passedValidation).toBe(true);
    });

    test('should handle mixed validation scenarios', async () => {
      const mockValidationResults = [
        {
          minerUID: 'miner1',
          passedValidation: true,
          data: [{ tweetId: '1', text: 'Tweet 1' }],
          count: 1,
          mostRecentDate: new Date('2024-03-20')
        },
        {
          minerUID: 'miner2',
          passedValidation: false,
          data: [],
          validationError: 'Failed structural validation'
        },
        {
          minerUID: 'miner3',
          passedValidation: true,
          data: [], // Passed validation but no data for spot check
          count: 0
        },
        {
          minerUID: 'miner4',
          passedValidation: true,
          data: [{ tweetId: '4', text: 'Tweet 4' }],
          count: 1,
          mostRecentDate: new Date('2024-03-18')
        }
      ];

      const mockVerifiedTweetsMap = new Map([
        ['1', { id: '1', verified: true }],
        ['4', { id: '4', verified: true }]
      ]);

      prepareResponses.mockReturnValue(mockValidationResults);
      performBatchSpotCheck.mockResolvedValue(mockVerifiedTweetsMap);
      validateMinerAgainstBatch
        .mockReturnValueOnce(true)  // miner1 passes
        .mockReturnValueOnce(false); // miner4 fails

      const result = await score(mockResponses, mockMetadata, mockResponseTimes, mockSynapseTimeout, mockMinerUIDs);

      // Verify batch spot check only includes miners with data
      expect(performBatchSpotCheck).toHaveBeenCalledWith([
        { minerUID: 'miner1', tweets: [{ tweetId: '1', text: 'Tweet 1' }] },
        { minerUID: 'miner4', tweets: [{ tweetId: '4', text: 'Tweet 4' }] }
      ], '"test-keyword"');

      // Verify validation was only performed for miners with data
      expect(validateMinerAgainstBatch).toHaveBeenCalledTimes(2);

      // Verify final results
      expect(result[0].passedValidation).toBe(true);
      expect(result[1].passedValidation).toBe(false);
      expect(result[1].validationError).toBe('Failed structural validation');
      expect(result[2].passedValidation).toBe(true); // No data but still valid
      expect(result[3].passedValidation).toBe(false);
      expect(result[3].validationError).toBe('Failed spot check verification');
      expect(result[3].count).toBe(0);
      expect(result[3].mostRecentDate).toBeUndefined();
    });

    test('should handle empty responses array', async () => {
      prepareResponses.mockReturnValue([]);

      const result = await score([], mockMetadata, [], mockSynapseTimeout, [], 'x-tweets');

      expect(prepareResponses).toHaveBeenCalledWith([], [], [], mockSynapseTimeout, mockMetadata, 'x-tweets');
      expect(performBatchSpotCheck).not.toHaveBeenCalled();
      expect(validateMinerAgainstBatch).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});
