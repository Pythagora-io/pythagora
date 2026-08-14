const { jsonObjToMongo } = require("../../../../../src/helpers/mongodb");
const {ObjectId} = require("mongodb");

describe('jsonObjToMongo', () => {
  test('should return correct output for an array input', () => {
    const input = [{ _id: 'ObjectId("60f1e7b5d119076884d289ad")', createdAt: 'Date("2021-08-10T08:47:00.000Z")' }];
    const expected = [{ _id: new ObjectId("60f1e7b5d119076884d289ad"), createdAt: new Date("2021-08-10T08:47:00.000Z") }];
    expect(jsonObjToMongo(input)).toEqual(expected);
  });

  test('should return correct output for a nested object input', () => {
    const input = { outer: { _id: 'ObjectId("60f1e7b5d119076884d289ad")', createdAt: 'Date("2021-08-10T08:47:00.000Z")' } };
    const expected = { outer: { _id: new ObjectId("60f1e7b5d119076884d289ad"), createdAt: new Date("2021-08-10T08:47:00.000Z") } };
    expect(jsonObjToMongo(input)).toEqual(expected);
  });

  test('should return correct output for a string input', () => {
    const input = 'ObjectId("60f1e7b5d119076884d289ad")';
    const expected = new ObjectId("60f1e7b5d119076884d289ad");
    expect(jsonObjToMongo(input)).toEqual(expected);
  });

  test('should return correct output for a date string input', () => {
    const input = 'Date("2021-08-10T08:47:00.000Z")';
    const expected = new Date("2021-08-10T08:47:00.000Z");
    expect(jsonObjToMongo(input)).toEqual(expected);
  });

  test('should return correct output for a RegExp string input', () => {
    const input = '/test\\wstring/i';
    const expected = /test\wstring/i;
    expect(jsonObjToMongo(input)).toEqual(expected);
  });

  test('should return correct output for an ObjectID string input', () => {
    const input = '60f1e7b5d119076884d289ad';
    const expected = new ObjectId("60f1e7b5d119076884d289ad");
    expect(jsonObjToMongo(input)).toEqual(expected);
  });

  test('should return the input for non-matching string input', () => {
    const input = 'non-matching string input';
    const expected = 'non-matching string input';
    expect(jsonObjToMongo(input)).toEqual(expected);
  });

  test('should return undefined for undefined input', () => {
    expect(jsonObjToMongo(undefined)).toBeUndefined();
  });

  test('should return null for null input', () => {
    expect(jsonObjToMongo(null)).toBeNull();
  });

  test('should return the input for non-object, non-array input', () => {
    const input = 123;
    const expected = 123;
    expect(jsonObjToMongo(input)).toEqual(expected);
  });
});
