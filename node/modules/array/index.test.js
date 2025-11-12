
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

  describe('.unique()', () => {
    test('should return unique elements from array', () => {
      const testArray = [1, 2, 2, 3, 3, 3, 4];
      const result = array.unique(testArray);
      expect(result).toEqual([1, 2, 3, 4]);
    });

    test('should handle empty array', () => {
      const result = array.unique([]);
      expect(result).toEqual([]);
    });

    test('should handle array with no duplicates', () => {
      const testArray = [1, 2, 3, 4];
      const result = array.unique(testArray);
      expect(result).toEqual([1, 2, 3, 4]);
    });
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

    test('should handle empty array', () => {
      const result = array.validateArray([], requiredFields);
      expect(result).toEqual({
        valid: [],
        invalid: []
      });
    });

    test('should handle custom validation returning error message', () => {
      const fields = [
        { name: 'a', type: 'string', validate: (value) => value.length > 2 || 'value too short' }
      ];
      const testArray = [
        { a: 'ok' },
        { a: 'good' }
      ];
      const result = array.validateArray(testArray, fields);
      expect(result).toEqual({
        valid: [{ a: 'good' }],
        invalid: [{
          isValid: false,
          item: { a: 'ok' },
          validationError: ""
        }]
      });
    });

    test('should pass entire item to custom validation function', () => {
      const mockValidate = jest.fn(() => true);
      const fields = [
        { name: 'a', type: 'string', validate: mockValidate }
      ];
      const testArray = [{ a: 'test', b: 'extra' }];
      array.validateArray(testArray, fields);
      expect(mockValidate).toHaveBeenCalledWith('test', { a: 'test', b: 'extra' });
    });
  });

  describe('.removeFields()', () => {
    test('should remove specified fields from array of objects', () => {
      const testArray = [
        { a: 1, b: 2, c: 3 },
        { a: 4, b: 5, c: 6 }
      ];
      const result = array.removeFields(testArray, ['b', 'c']);
      expect(result).toEqual([
        { a: 1 },
        { a: 4 }
      ]);
    });

    test('should handle empty fields array', () => {
      const testArray = [{ a: 1, b: 2 }];
      const result = array.removeFields(testArray, []);
      expect(result).toEqual([{ a: 1, b: 2 }]);
    });

    test('should handle removing non-existent fields', () => {
      const testArray = [{ a: 1, b: 2 }];
      const result = array.removeFields(testArray, ['c', 'd']);
      expect(result).toEqual([{ a: 1, b: 2 }]);
    });

    test('should not mutate original array', () => {
      const testArray = [{ a: 1, b: 2 }];
      const original = [...testArray];
      array.removeFields(testArray, ['b']);
      expect(testArray).toEqual(original);
    });
  });
});
