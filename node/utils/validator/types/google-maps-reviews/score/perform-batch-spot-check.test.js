import performBatchSpotCheck from './perform-batch-spot-check.js';
import apify from '#modules/apify/index.js';
import config from '#config';

jest.mock('#modules/logger/index.js', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

jest.mock('#modules/time/index.js', () => ({
  getDuration: jest.fn().mockReturnValue(0)
}));

jest.mock('#modules/apify/index.js');

describe('#utils/validator/google-maps/score/perform-batch-spot-check.js', () => {
  let responses;
  let results;
  let fid;

  beforeEach(() => {
    fid = "fid"
    responses = [{
      minerUID: 1,
      reviews: [
        {
          reviewUrl: "reviewUrl",
        }
      ]
    }]

    results = [{ reviewId: "reviewId" }, {}];
    apify.runActorAndGetResults.mockResolvedValue(results);
  });

  test('should fail properly if there is a problem on the execution', async () => {
    apify.runActorAndGetResults.mockRejectedValue(new Error("Error"));
    await expect(performBatchSpotCheck(responses, fid)).rejects.toThrow("Error");
  });

  test('should return the results properly', async () => {
    const result = await performBatchSpotCheck(responses, fid);
    expect(apify.runActorAndGetResults).toHaveBeenCalledWith(
      config.VALIDATOR.APIFY_ACTORS.GOOGLE_MAPS_REVIEWS_SPOT_CHECK, {
        startUrls: [{ url: "reviewUrl", method: "GET" }]
      }
    );
    const reviews = result.get("reviewId");
    expect(reviews).toEqual({ reviewId: "reviewId" });
  });
});
