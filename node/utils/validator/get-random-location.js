import { City, State }  from 'country-state-city';
import random from '#modules/random/index.js';

const COUNTRIES = [       
  "AL", // Albania
  "DZ", // Algeria
  "AU", // Australia
  "AT", // Austria
  "BE", // Belgium
  "BG", // Bulgaria
  "HR", // Croatia
  "CZ", // Czech Republic
  "DK", // Denmark
  "EE", // Estonia
  "FI", // Finland
  "FR", // France
  "DE", // Germany
  "GR", // Greece
  "IS", // Iceland
  "IE", // Ireland
  "IT", // Italy
  "JP", // Japan
  "KR", // South Korea
  "LI", // Liechtenstein
  "LT", // Lithuania
  "LU", // Luxembourg
  "MT", // Malta
  "MC", // Monaco
  "NL", // Netherlands
  "NZ", // New Zealand
  "NO", // Norway
  "PL", // Poland
  "PT", // Portugal
  "RO", // Romania
  "RS", // Serbia
  "SK", // Slovakia
  "SI", // Slovenia
  "ES", // Spain
  "SE", // Sweden
  "CH", // Switzerland
  "UA", // Ukraine
  "GB", // United Kingdom
  "US", // United States
];

/**
 * Get a random location in the US
 * @returns {string} - The random location
 */
const getRandomLocation = () => {
  const randomCountry = random.fromArray(COUNTRIES);
  const states = State.getStatesOfCountry(randomCountry)
  const randomState = random.fromArray(states);
  const cities = City.getCitiesOfState(randomCountry, randomState.isoCode);
  const randomCity = random.fromArray(cities);
  const location = `${randomCity.name}, ${randomState.name}`;
  return location;
}

export default getRandomLocation;
