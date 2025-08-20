import getRandomLocation from './get-random-location.js';
import random from '#modules/random/index.js';
import { City, State } from 'country-state-city';

jest.mock('#modules/random/index.js', () => ({
  fromArray: jest.fn()
}));

jest.mock('country-state-city', () => ({
  City: {
    getCitiesOfState: jest.fn()
  },
  State: {
    getStatesOfCountry: jest.fn()
  }
}));

describe('#utils/validator/get-random-location.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return a random location when all selections succeed', () => {
    // Mock successful selections
    random.fromArray
      .mockReturnValueOnce('US') // country selection
      .mockReturnValueOnce({ name: 'California', isoCode: 'CA' }) // state selection
      .mockReturnValueOnce({ name: 'Los Angeles', isoCode: 'LA' }); // city selection

    State.getStatesOfCountry.mockReturnValue([
      { name: 'California', isoCode: 'CA' },
      { name: 'Texas', isoCode: 'TX' }
    ]);

    City.getCitiesOfState.mockReturnValue([
      { name: 'Los Angeles', isoCode: 'LA' },
      { name: 'San Francisco', isoCode: 'SF' }
    ]);

    const result = getRandomLocation();

    expect(random.fromArray).toHaveBeenCalledTimes(3);
    expect(State.getStatesOfCountry).toHaveBeenCalledWith('US');
    expect(City.getCitiesOfState).toHaveBeenCalledWith('US', 'CA');
    expect(result).toEqual('Los Angeles, California');
  });

  test('should retry when no random country is selected', () => {
    // First call returns null/undefined, second call succeeds
    random.fromArray
      .mockReturnValueOnce() // first country selection fails
      .mockReturnValueOnce('US') // second country selection succeeds
      .mockReturnValueOnce({ name: 'California', isoCode: 'CA' }) // state selection
      .mockReturnValueOnce({ name: 'Los Angeles', isoCode: 'LA' }); // city selection

    State.getStatesOfCountry.mockReturnValue([
      { name: 'California', isoCode: 'CA' }
    ]);

    City.getCitiesOfState.mockReturnValue([
      { name: 'Los Angeles', isoCode: 'LA' }
    ]);

    const result = getRandomLocation();

    expect(random.fromArray).toHaveBeenCalledTimes(4);
    expect(result).toEqual('Los Angeles, California');
  });

  test('should retry when no states are found for the country', () => {
    // First call gets country but no states, second call succeeds
    random.fromArray
      .mockReturnValueOnce('XX') // first country selection
      .mockReturnValueOnce('US') // second country selection (after retry)
      .mockReturnValueOnce({ name: 'California', isoCode: 'CA' }) // state selection
      .mockReturnValueOnce({ name: 'Los Angeles', isoCode: 'LA' }); // city selection

    State.getStatesOfCountry
      .mockReturnValueOnce() // first call returns undefined
      .mockReturnValueOnce([{ name: 'California', isoCode: 'CA' }]); // second call succeeds

    City.getCitiesOfState.mockReturnValue([
      { name: 'Los Angeles', isoCode: 'LA' }
    ]);

    const result = getRandomLocation();

    expect(random.fromArray).toHaveBeenCalledTimes(4);
    expect(State.getStatesOfCountry).toHaveBeenCalledTimes(2);
    expect(result).toEqual('Los Angeles, California');
  });

  test('should retry when no random city is selected', () => {
    // First call gets country and state but no city, second call succeeds
    random.fromArray
      .mockReturnValueOnce('US') // first country selection
      .mockReturnValueOnce({ name: 'California', isoCode: 'CA' }) // first state selection
      .mockReturnValueOnce() // first city selection fails
      .mockReturnValueOnce('US') // second country selection (after retry)
      .mockReturnValueOnce({ name: 'Texas', isoCode: 'TX' }) // second state selection
      .mockReturnValueOnce({ name: 'Houston', isoCode: 'HOU' }); // second city selection succeeds

    State.getStatesOfCountry.mockReturnValue([
      { name: 'California', isoCode: 'CA' },
      { name: 'Texas', isoCode: 'TX' }
    ]);

    City.getCitiesOfState
      .mockReturnValueOnce([{ name: 'Los Angeles', isoCode: 'LA' }]) // first call
      .mockReturnValueOnce([{ name: 'Houston', isoCode: 'HOU' }]); // second call

    const result = getRandomLocation();

    expect(random.fromArray).toHaveBeenCalledTimes(6);
    expect(result).toEqual('Houston, Texas');
  });

  test('should handle empty states array by selecting undefined state', () => {
    // When states array is empty, random.fromArray returns undefined
    random.fromArray
      .mockReturnValueOnce('XX') // first country selection
      .mockReturnValueOnce(); // state selection from empty array returns undefined

    State.getStatesOfCountry.mockReturnValue([]); // returns empty array

    // This should throw an error when accessing randomState.isoCode since randomState is undefined
    expect(() => getRandomLocation()).toThrow();
  });

  test('should handle undefined city selection', () => {
    random.fromArray
      .mockReturnValueOnce('US') // first country selection
      .mockReturnValueOnce({ name: 'California', isoCode: 'CA' }) // first state selection
      .mockReturnValueOnce() // first city selection fails
      .mockReturnValueOnce('US') // second country selection (after retry)
      .mockReturnValueOnce({ name: 'Texas', isoCode: 'TX' }) // second state selection
      .mockReturnValueOnce({ name: 'Houston', isoCode: 'HOU' }); // second city selection succeeds

    State.getStatesOfCountry.mockReturnValue([
      { name: 'California', isoCode: 'CA' },
      { name: 'Texas', isoCode: 'TX' }
    ]);

    City.getCitiesOfState.mockReturnValue([
      { name: 'Houston', isoCode: 'HOU' }
    ]);

    const result = getRandomLocation();

    expect(random.fromArray).toHaveBeenCalledTimes(6);
    expect(result).toEqual('Houston, Texas');
  });
});
