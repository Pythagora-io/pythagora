describe("isJSONObject", () => {
  test("should return true for an empty object", () => {
    const { isJSONObject } = require("../../../../../src/utils/common.js");
    expect(isJSONObject({})).toBeTruthy();
  });

  test("should return true for a non-empty object", () => {
    const { isJSONObject } = require("../../../../../src/utils/common.js");
    expect(isJSONObject({ key: "value" })).toBeTruthy();
  });

  test("should return false for an array", () => {
    const { isJSONObject } = require("../../../../../src/utils/common.js");
    expect(isJSONObject([])).toBeFalsy();
  });

  test("should return false for a string", () => {
    const { isJSONObject } = require("../../../../../src/utils/common.js");
    expect(isJSONObject("test string")).toBeFalsy();
  });

  test("should return false for a number", () => {
    const { isJSONObject } = require("../../../../../src/utils/common.js");
    expect(isJSONObject(42)).toBeFalsy();
  });

  test("should return false for a boolean", () => {
    const { isJSONObject } = require("../../../../../src/utils/common.js");
    expect(isJSONObject(true)).toBeFalsy();
  });

  test("should return false for null", () => {
    const { isJSONObject } = require("../../../../../src/utils/common.js");
    expect(isJSONObject(null)).toBeFalsy();
  });

  test("should return false for undefined", () => {
    const { isJSONObject } = require("../../../../../src/utils/common.js");
    expect(isJSONObject(undefined)).toBeFalsy();
  });

  test("should return false for a function", () => {
    const { isJSONObject } = require("../../../../../src/utils/common.js");
    expect(isJSONObject(() => {})).toBeFalsy();
  });

  test("should return false for a built-in Error object", () => {
    const { isJSONObject } = require("../../../../../src/utils/common.js");
    expect(isJSONObject(new Error())).toBeFalsy();
  });

  test("should return false for a Date object", () => {
    const { isJSONObject } = require("../../../../../src/utils/common.js");
    expect(isJSONObject(new Date())).toBeFalsy();
  });

  test("should return false for a RegExp object", () => {
    const { isJSONObject } = require("../../../../../src/utils/common.js");
    expect(isJSONObject(/test/)).toBeFalsy();
  });
});