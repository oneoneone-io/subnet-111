import sendForDigestion from '#utils/validator/send-for-digestion.js';
import logger from '#modules/logger/index.js';
import prepareAndSendForDigestion from './prepare-and-send-for-digestion.js';

jest.mock('#modules/logger/index.js', () => ({
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn()
}));

jest.mock('#utils/validator/send-for-digestion.js', () => jest.fn());

describe('#utils/validator/google-maps/score/prepare-and-send-for-digestion.js', () => {
  let responses;
  let minerUIDs;
  let metadata;

  beforeEach(() => {
    jest.clearAllMocks();
    responses = [[{
        reviewerId: '1',
        reviewerUrl: 'https://www.google.com',
        reviewerName: 'John Doe',
        reviewId: '123',
        reviewUrl: 'https://www.google.com',
        publishedAtDate: '2021-01-01',
        placeId: '123',
        cid: '123',
        fid: 'fid123',
        totalScore: 5,
    }],[{
        reviewerId: '2',
        reviewerUrl: 'https://www.google.com',
        reviewerName: 'John Doe',
        reviewId: '123',
        reviewUrl: 'https://www.google.com',
        publishedAtDate: '2021-01-01',
        placeId: '123',
        cid: '123',
        fid: 'fid123',
        totalScore: 5,
    },{
        reviewerId: '3',
        reviewerUrl: 'https://www.google.com',
        reviewerName: 'John Doe',
        reviewId: '123',
        reviewUrl: 'https://www.google.com',
        publishedAtDate: '2021-01-01',
        placeId: '123',
        cid: '123',
        fid: 'fid1234',
        totalScore: 5,
    }]];
    minerUIDs = [0];
    metadata = { dataId: 'fid123', name: 'Test Place' };
    sendForDigestion.mockResolvedValue({status: 200});
  });

  test('should send the data for digestion', async () => {
    await prepareAndSendForDigestion(responses, minerUIDs, metadata);
    expect(sendForDigestion).toHaveBeenCalledTimes(2);
  });

  test('should put an error if the data is not sent for digestion', async () => {
    sendForDigestion.mockResolvedValue({status: 400});
    await prepareAndSendForDigestion(responses, minerUIDs, metadata);
    expect(logger.info).toHaveBeenCalledTimes(2);
  });
});
