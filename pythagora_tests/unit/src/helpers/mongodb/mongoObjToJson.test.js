const {ObjectId} = require("mongodb");
const {mongoObjToJson} = require("../../../../../src/helpers/mongodb");

describe("mongoObjToJson", () => {
  test('should convert ObjectId to string format', () => {
    const objectId = new ObjectId();
    expect(mongoObjToJson(objectId)).toEqual(`ObjectId("${objectId.toString()}")`);
  });

  test('should convert Date to string format', () => {
    const date = new Date();
    expect(mongoObjToJson({ time: date })).toEqual({ time: `Date("${date.toISOString()}")` });
  });

  test('should convert RegExp to string format', () => {
    const regex = /^test$/i;
    expect(mongoObjToJson({ pattern: regex })).toEqual({ pattern: `RegExp("${regex.toString()}")` });
  });

  test('should handle nested objects and arrays', () => {
    const objectId = new ObjectId();
    const date = new Date();
    const regex = new RegExp(/^test$/i);
    const input = {
      _id: objectId,
      dates: [{ time: date }],
      regexArr: [regex],
      nestedObj: { _id: objectId, time: date, patternRegex: regex },
    };
    const expectedResult = {
      _id: `ObjectId("${objectId.toString()}")`,
      dates: [{ time: `Date("${date.toISOString()}")` }],
      regexArr: [`RegExp("${regex.toString()}")`],
      nestedObj: {
        _id: `ObjectId("${objectId.toString()}")`,
        time: `Date("${date.toISOString()}")`,
        patternRegex: `RegExp("${regex.toString()}")`,
      },
    };
    expect(mongoObjToJson(input)).toEqual(expectedResult);
  });

  test('should return null if input is null', () => {
    expect(mongoObjToJson(null)).toBeNull();
  });

  test('should return undefined if input is undefined', () => {
    expect(mongoObjToJson(undefined)).toBeUndefined();
  });
});
