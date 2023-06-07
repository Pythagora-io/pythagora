const { getCircularReplacer, ObjectId } = require('../../../../../src/utils/common');

describe('getCircularReplacer', () => {
  test('should return JSON with ObjectId converted to string', () => {
    const objectId = new ObjectId();
    const objectWithObjectId = { _id: objectId };
    expect(JSON.stringify(objectWithObjectId, getCircularReplacer())).toBe(`{"_id":"${objectId.toString()}"}`);
  });

  test('should return JSON with RegExp converted to string', () => {
    const objectWithRegExp = { regex: /test/i };
    expect(JSON.stringify(objectWithRegExp, getCircularReplacer())).toBe('{"regex":"RegExp(\\"/test/i\\")"}');
  });

  test('should not affect non-circular objects', () => {
    const nonCircularObject = { a: 1, b: 'test', c: { d: 5 } };
    expect(JSON.parse(JSON.stringify(nonCircularObject, getCircularReplacer()))).toEqual(nonCircularObject);
  });
});
