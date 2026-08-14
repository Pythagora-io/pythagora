describe("isLegacyObjectId tests", () => {
  const { isLegacyObjectId, ObjectId } = require('../../../../../src/utils/common.js')

  test("should return false for null value", () => {
    const value = null;
    expect(isLegacyObjectId(value)).toBeFalsy();
  });

  test("should return false for undefined value", () => {
    const value = undefined;
    expect(isLegacyObjectId(value)).toBeFalsy();
  });

  test("should return false for empty object", () => {
    const value = {};
    expect(isLegacyObjectId(value)).toBeFalsy();
  });

  test("should return false for object with no constructor", () => {
    const value = Object.create(null);
    expect(isLegacyObjectId(value)).toBeFalsy();
  });

  test("should return false for non-ObjectID constructor", () => {
    const value = { constructor: { name: "NotObjectID" } };
    expect(isLegacyObjectId(value)).toBeFalsy();
  });

  test("should return false for non-ID object inside ObjectID constructor", () => {
    const value = new ObjectId();
    value.id = "InvalidID";
    expect(isLegacyObjectId(value)).toBeFalsy();
  });

  test("should return true for valid ObjectId with valid JSON ID", () => {
    const objectId = new ObjectId();
    const value = {
      constructor: { name: "ObjectID" },
      id: objectId
    };
    expect(isLegacyObjectId(value)).toBeTruthy();
  });
});
