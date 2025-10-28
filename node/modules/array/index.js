import logger from '#modules/logger/index.js';

/**
 * Creates a new array with unique elements based on a specified key.
 * @param {Array<any>} array - The input array to remove duplicates from
 * @param {string} key - The key to use for uniqueness comparison
 * @returns {Array<any>} A new array containing unique elements based on the specified key
 * @example
 * const users = [
 *   { id: 1, name: 'John' },
 *   { id: 2, name: 'Jane' },
 *   { id: 1, name: 'John' }
 * ];
 * const uniqueUsers = uniqueBy(users, 'id');
 * // Result: [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }]
 */
const uniqueBy = (array, key) => {
  return [...new Map(array.map(item => [item[key], item])).values()];
};

/**
 * Validates an array of objects against a set of required fields with type checking and custom validation.
 * @param {Array<Object>} array - The array of objects to validate
 * @param {Array<{name: string, type: string, validate?: Function}>} requiredFields - Array of field definitions
 * @param {string} requiredFields[].name - The name of the required field
 * @param {string} requiredFields[].type - The expected type of the field
 * @param {Function} [requiredFields[].validate] - Optional custom validation function
 * @returns {{valid: Array<Object>, invalid: Array<{item: Object, isValid: boolean, validationError: string}>}}
 * An object containing arrays of valid and invalid items
 * @example
 * const items = [
 *   { id: 1, name: 'John' },
 *   { id: '2', name: 'Jane' }
 * ];
 * const fields = [
 *   { name: 'id', type: 'number' },
 *   { name: 'name', type: 'string' }
 * ];
 * const result = validateArray(items, fields);
 */
const validateArray = (array, requiredFields) => {
  const valid = [];
  const invalid = [];

  for (const item of array) {
    const itemValidation = {
      item,
      isValid: true,
      validationError: ''
    };

    for (const field of requiredFields) {
      // Check if field exists
      if (!(field.name in item)) {
        itemValidation.isValid = false;
        logger.warning(`${field.name} is required but missing`);
        break;
      }

      // Type validation
      const fieldValue = item[field.name];
      const actualType = typeof fieldValue;
      const expectedType = field.type.toLowerCase();

      if (actualType !== expectedType) {
        itemValidation.isValid = false;
        logger.warning(`${field.name} should be ${expectedType} but is ${actualType}`);
        break;
      }

      // Custom validation if provided
      if (field.validate && typeof field.validate === 'function') {
        const customValidation = field.validate(fieldValue, item);
        if (customValidation !== true) {
          itemValidation.isValid = false;
          logger.warning(`${field.name} failed custom validation: ${customValidation}`);
          break;
        }
      }
    }

    if (itemValidation.isValid) {
      valid.push(item);
    } else {
      invalid.push(itemValidation);
    }
  }

  return { valid, invalid };
};

/**
 * Create a new array with unique elements
 * @param {Array} array - The array to create a new array with unique elements from
 * @returns {Array} - The new array with unique elements
 */
const unique = (array) => [...new Set(array)];

export default {
  uniqueBy,
  validateArray,
  unique
};
