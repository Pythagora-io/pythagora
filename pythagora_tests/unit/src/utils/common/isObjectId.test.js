describe("isObjectId function tests", () => {
  const { isObjectId } = require('../../../../../src/utils/common.js');

  test("Valid ObjectId string", () => {
    expect(isObjectId("507f1f77bcf86cd799439011")).toBe(true);
  });

  test("Invalid ObjectId string (wrong characters)", () => {
    expect(isObjectId("507f1!77bcf86cd799439011")).toBe(false);
  });

  test("Invalid ObjectId string (wrong length)", () => {
    expect(isObjectId("507f1f77bcf86990439")).toBe(false);
  });

  test("Valid ObjectId wrapped in ObjectId() string", () => {
    expect(isObjectId('ObjectId("507f1f77bcf86cd799439011")')).toBe(true);
  });

  test("Invalid ObjectId wrapped in ObjectId() string", () => {
    expect(isObjectId('ObjectId("507f1f77bcf86cdr!707")')).toBe(false);
  });

  test("isObjectId with non-string input", () => {
    expect(isObjectId(123456)).toBe(false);
  });

  test("isObjectId with null input", () => {
    expect(isObjectId(null)).toBe(false);
  });

  test("isObjectId with undefined input", () => {
    expect(isObjectId(undefined)).toBe(false);
  });

  test("isObjectId with empty object input", () => {
    expect(isObjectId({})).toBe(false);
  });

  test("isObjectId with empty array input", () => {
    expect(isObjectId([])).toBe(false);
  });

  test("isObjectId with true boolean input", () => {
    expect(isObjectId(true)).toBe(false);
  });

  test("isObjectId with false boolean input", () => {
    expect(isObjectId(false)).toBe(false);
  });

  test("isObjectId with valid ObjectId instance", () => {
    const objectId = new (require('../../../../../src/utils/common.js').ObjectId)("507f1f77bcf86cd799439011");
    expect(isObjectId(objectId)).toBe(true);
  });

  test("isObjectId with invalid ObjectId instance", () => {
    expect(isObjectId("507f1")).toBe(false);
  });

});
