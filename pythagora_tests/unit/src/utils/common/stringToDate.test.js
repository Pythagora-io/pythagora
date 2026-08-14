describe('stringToDate', () => {
  test('should return date when input matches dateAsStringRegex', () => {
    const input = 'Date("2021-11-02T12:30:25.000Z")';
    const expectedOutput = new Date('2021-11-02T12:30:25.000Z');
    const { stringToDate } = require('../../../../../src/utils/common.js');
    expect(stringToDate(input)).toEqual(expectedOutput);
  });

  test('should return input when input does not match dateAsStringRegex', () => {
    const input = 'Not a date string';
    const { stringToDate } = require('../../../../../src/utils/common.js');
    expect(stringToDate(input)).toBe(input);
  });

  test('should return input when input matches dateAsStringRegex but date is invalid', () => {
    const input = 'Date("Invalid date string")';
    const { stringToDate } = require('../../../../../src/utils/common.js');
    expect(stringToDate(input)).toBe(input);
  });

  test('should return date when input has various date formats', () => {
    const inputs = [
      'Date("2021-11-02T12:30:25.000Z")',
      'Date("2021-11-02T12:30:25Z")',
      'Date("2021-11-02")'
    ];
    const expectedOutputs = [
      new Date('2021-11-02T12:30:25.000Z'),
      new Date('2021-11-02T12:30:25Z'),
      new Date('2021-11-02')
    ];
    const { stringToDate } = require('../../../../../src/utils/common.js');
    inputs.forEach((input, index) => {
      expect(stringToDate(input)).toEqual(expectedOutputs[index]);
    });
  });
});