import getEligiblePlace from './get-eligible-place.js';
import random from '#modules/random/index.js';
import apify from '#modules/apify/index.js';
import config from '#config';
import getRandomLocation from '#utils/validator/get-random-location.js';

jest.mock('#modules/random/index.js', () => ({
  fromArray: jest.fn()
}));
jest.mock('#modules/apify/index.js', () => ({
  runActorAndGetResults: jest.fn()
}));
jest.mock('#modules/logger/index.js', () => ({
  info: jest.fn()
}));
jest.mock('#modules/time/index.js', () => ({
  getDuration: jest.fn().mockReturnValue(0)
}));
jest.mock('#utils/validator/get-random-location.js', () => jest.fn());

describe('utils/validator/google-maps/create-synthetic/get-eligible-place.js', () => {
  let selectedPlace;
  let items;

  beforeEach(() => {
    selectedPlace = {
      fid: 'selected-fid',
      title: 'Selected Place',
      reviewsCount: 10_000,
      type: 'place',
    }

    items = Array.from({ length: config.VALIDATOR.APIFY_SEARCH_MAX_ITEMS }, (_, index) => ({
      fid: `fid-${index}`,
      title: `title-${index}`,
      reviewsCount: index,
      type: 'place',
    }));

    getRandomLocation.mockReturnValueOnce('location')
    random.fromArray.mockReturnValueOnce('place')
    random.fromArray.mockReturnValue(selectedPlace);

    apify.runActorAndGetResults.mockResolvedValue(items);
  });

  test('should return a selected place properly', async () => {
    items[0].reviewsCount = 10_000;
    items[1].reviewsCount = undefined;
    apify.runActorAndGetResults.mockResolvedValue(items);

    const result = await getEligiblePlace();

    expect(apify.runActorAndGetResults).toHaveBeenCalledWith(config.VALIDATOR.APIFY_ACTORS.GOOGLE_MAPS_SEARCH, {
      searchTerms: ['place in location'],
      language: config.VALIDATOR.GOOGLE_REVIEWS_SYNAPSE_PARAMS.language,
      maxItems: config.VALIDATOR.APIFY_SEARCH_MAX_ITEMS
    });
    expect(getRandomLocation).toHaveBeenCalledTimes(1);
    expect(result).toEqual(selectedPlace);
  });

  test('should handle empty results from apify', async () => {
    apify.runActorAndGetResults.mockResolvedValue([]);

    await expect(getEligiblePlace()).rejects.toThrow();
  });

  test('should handle apify errors', async () => {
    apify.runActorAndGetResults.mockRejectedValue(new Error('Apify error'));

    await expect(getEligiblePlace()).rejects.toThrow('Apify error');
  });
});
