describe('stringToRegExp tests', () => {
  const { stringToRegExp } = require('../../../../../src/utils/common.js');

  test('stringToRegExp should return input if input is not a RegExp string', () => {
    const input = 'not a RegExp';
    expect(stringToRegExp(input)).toBe(input);
  });

  test('stringToRegExp should return RegExp without flags if input is a RegExp string without flags', () => {
    const input = 'RegExp("/hello/")';
    expect(stringToRegExp(input)).toStrictEqual(/hello/);
  });

  test('stringToRegExp should return RegExp with flags if input is a RegExp string with flags', () => {
    const input = 'RegExp("/hello/i")';
    expect(stringToRegExp(input)).toStrictEqual(/hello/i);
  });

  test('stringToRegExp should return RegExp even if pattern contains escaped double quotes', () => {
    const input = 'RegExp("/say \\"hello\\" to everyone/i")';
    expect(stringToRegExp(input)).toStrictEqual(/say "hello" to everyone/i);
  });

  test('stringToRegExp should return RegExp even if pattern contains escaped slashes', () => {
    const input = 'RegExp("/match\\/this/g")';
    expect(stringToRegExp(input)).toStrictEqual(/match\/this/g);
  });
});
