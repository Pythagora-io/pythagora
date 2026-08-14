describe('insertVariablesInText', () => {
  const { insertVariablesInText } = require('../../../../../src/utils/common.js');

  test('inserts single variable', () => {
    const input = 'Hello, {{name}}!';
    const variables = { name: 'John' };
    const expectedResult = 'Hello, John!';
    expect(insertVariablesInText(input, variables)).toEqual(expectedResult);
  });

  test('inserts multiple variables', () => {
    const input = 'My name is {{firstName}} {{lastName}}, I am {{age}} years old.';
    const variables = { firstName: 'John', lastName: 'Doe', age: 30 };
    const expectedResult = 'My name is John Doe, I am 30 years old.';
    expect(insertVariablesInText(input, variables)).toEqual(expectedResult);
  });

  test('inserts object variable', () => {
    const input = 'My favorite colors are {{colors}}.';
    const variables = { colors: { primary: 'red', secondary: 'blue' } };
    const expectedResult = 'My favorite colors are {\n  "primary": "red",\n  "secondary": "blue"\n}.';
    expect(insertVariablesInText(input, variables)).toEqual(expectedResult);
  });

  test('ignores missing variable', () => {
    const input = 'Hello, {{name}}!';
    const variables = {};
    const expectedResult = 'Hello, {{name}}!';
    expect(insertVariablesInText(input, variables)).toEqual(expectedResult);
  });

  test('inserts empty string for variable with empty value', () => {
    const input = 'Hello, {{name}}!';
    const variables = { name: '' };
    const expectedResult = 'Hello, !';
    expect(insertVariablesInText(input, variables)).toEqual(expectedResult);
  });

  test('inserts number variable as string', () => {
    const input = 'I have {{count}} apples.';
    const variables = { count: 5 };
    const expectedResult = 'I have 5 apples.';
    expect(insertVariablesInText(input, variables)).toEqual(expectedResult);
  });

  test('inserts boolean variable as string', () => {
    const input = 'The statement is {{value}}.';
    const variables = { value: true };
    const expectedResult = 'The statement is true.';
    expect(insertVariablesInText(input, variables)).toEqual(expectedResult);
  });

  test('inserts null variable as string', () => {
    const input = 'My variable is {{value}}.';
    const variables = { value: null };
    const expectedResult = 'My variable is null.';
    expect(insertVariablesInText(input, variables)).toEqual(expectedResult);
  });
});