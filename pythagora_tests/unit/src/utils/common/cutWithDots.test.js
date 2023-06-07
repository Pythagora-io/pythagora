describe("cutWithDots", () => {
  test("should not change a string with length less than cutAtChar", () => {
    const { cutWithDots } = require('../../../../../src/utils/common.js');
    const input = "short string";
    const result = cutWithDots(input, 20);
    expect(result).toBe(input);
  });

  test("should not change a string with length equal to cutAtChar", () => {
    const { cutWithDots } = require('../../../../../src/utils/common.js');
    const input = "string with exactly 30 chars!!";
    const result = cutWithDots(input, 30);
    expect(result).toBe(input);
  });

  test("should cut a string with length greater than cutAtChar and add '...'", () => {
    const { cutWithDots } = require('../../../../../src/utils/common.js');
    const input = "long string with more than 30 characters";
    const result = cutWithDots(input, 30);
    expect(result).toBe("long string with more than 30 ...");
  });

  test("should return empty string when input is an empty string", () => {
    const { cutWithDots } = require('../../../../../src/utils/common.js');
    const input = "";
    const result = cutWithDots(input, 10);
    expect(result).toBe(input);
  });
});
