const { getOccurrenceInArray } = require("../../../../../src/utils/common.js");

describe("getOccurrenceInArray", () => {
  test("should return 0 for empty array", () => {
    const result = getOccurrenceInArray([], 1);
    expect(result).toBe(0);
  });

  test("should return correct count for single occurrence", () => {
    const result = getOccurrenceInArray([1, 2, 3, 4], 3);
    expect(result).toBe(1);
  });

  test("should return correct count for multiple occurrences", () => {
    const result = getOccurrenceInArray([1, 2, 3, 3, 4, 5, 3], 3);
    expect(result).toBe(3);
  });

  test("should return 0 for value not in array", () => {
    const result = getOccurrenceInArray([1, 2, 4, 5], 3);
    expect(result).toBe(0);
  });

  test("should return correct count for string values", () => {
    const result = getOccurrenceInArray(["a", "b", "a", "c", "b"], "a");
    expect(result).toBe(2);
  });

  test("should return 0 for non-existing string value", () => {
    const result = getOccurrenceInArray(["a", "b", "a", "c", "b"], "d");
    expect(result).toBe(0);
  });

  test("should return correct count for mixed type array", () => {
    const result = getOccurrenceInArray([1, "2", 3, "3", 4, 5, "3"], 3);
    expect(result).toBe(1);
  });
});
