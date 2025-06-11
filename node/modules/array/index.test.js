
import array from './index.js';

jest.mock('#modules/logger/index.js', () => ({
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
}));

describe('modules/array', () => {
  let array_;

  beforeEach(() => {
    array_ = [{a: 1}, {a: 1}, {a: 3}];
  });

  describe('.uniqueBy()', () => {
    test('should return the unique elements based on the key', () => {
      const result = array.uniqueBy(array_,'a');
      expect(result).toEqual([{a: 1}, {a: 3}]);
    });
  });

  describe('.validateArray()', () => {
    const requiredFields = [
      { name: 'a', type: 'string' },
      { name: 'b', type: 'number', validate: (value) => value > 10 },
    ]

    test('should validate the array properly', () => {
      array_ = [
        {a: '1', b: 11},
        {a: "2", b: 11},
        {a: 3, b: 11},
        { b: 9 },
        { a: "1", b: 9 }
      ];
      const result = array.validateArray(array_, requiredFields);
      expect(result).toEqual({
        valid: [{a: '1', b: 11}, {a: "2", b: 11}],
        invalid: [{
          isValid: false,
          item: {
            a: 3,
            b: 11
          },
          validationError: ""
        },{
          isValid: false,
          item: {
            b: 9
          },
          validationError: ""
        }
        ,{
          isValid: false,
          item: {
            a: "1",
            b: 9
          },
          validationError: ""
        }]
      });
    });
  });
});
