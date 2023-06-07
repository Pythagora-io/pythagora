const { cleanupGPTResponse } = require('../../../../../src/helpers/api');

describe('cleanupGPTResponse', () => {
  test('should remove code block markdown in the start and end', () => {
    const input = "```\nThis is a test\n```";
    const expected = 'This is a test\n';
    expect(cleanupGPTResponse(input)).toBe(expected);
  });

  test('should return input unchanged if it does not begin with code block markdown', () => {
    const input = 'This is another test';
    const expected = 'This is another test';
    expect(cleanupGPTResponse(input)).toBe(expected);
  });

  test('should handle empty input string', () => {
    const input = '';
    const expected = '';
    expect(cleanupGPTResponse(input)).toBe(expected);
  });

  test('should handle input string with only code block markdown and nothing else', () => {
    const input = '```\n```';
    const expected = '';
    expect(cleanupGPTResponse(input)).toBe(expected);
  });

  test('should handle multiple lines in code block markdown', () => {
    const input = '```\nLine 1\nLine 2\nLine 3```';
    const expected = 'Line 1\nLine 2\nLine 3';
    expect(cleanupGPTResponse(input)).toBe(expected);
  });

  test('should not remove code block markdown from the middle of the string', () => {
    const input = 'This is a test with ```code inside``` the string';
    const expected = 'This is a test with ```code inside``` the string';
    expect(cleanupGPTResponse(input)).toBe(expected);
  });
});
