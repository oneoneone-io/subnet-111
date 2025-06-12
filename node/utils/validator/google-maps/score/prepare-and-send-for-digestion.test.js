import sendForDigestion from '#utils/validator/send-for-digestion.js';
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
  let fid;

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
    fid = 'fid123';
    sendForDigestion.mockResolvedValue(true);
  });

  test('should send the data for digestion', async () => {
    await prepareAndSendForDigestion(responses, minerUIDs, fid);
    expect(sendForDigestion).toHaveBeenCalledWith('google-maps-reviews', 0, responses[0]);
  });
});
