import getRandomLocation from './get-random-location.js';
import random from '#modules/random/index.js';
jest.mock('#modules/random/index.js', () => ({
  fromArray: jest.fn().mockImplementation((array) => array[0])
}));

jest.mock('country-state-city', () => ({
  City: {
    getCitiesOfState: jest.fn().mockReturnValue([{ name: 'city1', isoCode: 'city1' }, { name: 'city2', isoCode: 'city2' }])
  },
  State: {
    getStatesOfCountry: jest.fn().mockReturnValue([{ name: 'state1', isoCode: 'state1' }, { name: 'state2', isoCode: 'state2' }])
  }
}));

describe('#utils/validator/get-random-location.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return a random location', () => {
    const result = getRandomLocation();
    expect(random.fromArray).toHaveBeenCalledTimes(3);
    expect(random.fromArray).toHaveBeenCalledWith([{ name: 'city1', isoCode: 'city1' }, { name: 'city2', isoCode: 'city2' }]);
    expect(random.fromArray).toHaveBeenCalledWith([{ name: 'state1', isoCode: 'state1' }, { name: 'state2', isoCode: 'state2' }]);
    expect(result).toEqual('city1, state1');
  });
});
