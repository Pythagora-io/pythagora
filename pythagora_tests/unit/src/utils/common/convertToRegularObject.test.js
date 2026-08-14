const { ObjectId, convertToRegularObject } = require('../../../../../src/utils/common.js');

describe('convertToRegularObject tests', () => {
  test('convertToRegularObject with null object', () => {
    expect(convertToRegularObject(null)).toBeNull();
  });

  test('convertToRegularObject with empty object', () => {
    expect(convertToRegularObject({})).toEqual({});
  });

  test('convertToRegularObject with string containing ObjectId', () => {
    const inputObj = { _id: new ObjectId().toString() };
    const outputObj = convertToRegularObject(inputObj);
    expect(outputObj._id.toString()).toEqual(inputObj._id);
  });

  test('convertToRegularObject with nested ObjectId', () => {
    const inputObj = { info: { userId: new ObjectId().toString() } };
    const outputObj = convertToRegularObject(inputObj);
    expect(outputObj.info.userId.toString()).toEqual(inputObj.info.userId);
  });

  test('convertToRegularObject with an ISO 8601 date string', () => {
    const inputObj = { date: new Date().toISOString() };
    const outputObj = convertToRegularObject(inputObj);
    expect(outputObj.date).toBeInstanceOf(Date);
    expect(outputObj.date.toISOString()).toEqual(inputObj.date);
  });

  test('convertToRegularObject with RegExp string', () => {
    const inputObj = { regex: 'RegExp("/test/gim")' };
    const outputObj = convertToRegularObject(inputObj);
    expect(outputObj.regex).toBeInstanceOf(RegExp);
    expect(outputObj.regex.toString()).toEqual('/test/gim');
  });

  test('convertToRegularObject with nested RegExp string', () => {
    const inputObj = { rules: { regex: 'RegExp("/test/gim")' } };
    const outputObj = convertToRegularObject(inputObj);
    expect(outputObj.rules.regex).toBeInstanceOf(RegExp);
    expect(outputObj.rules.regex.toString()).toEqual('/test/gim');
  });

  test('convertToRegularObject with circular reference', () => {
    const objA = { name: 'A' };
    const objB = { name: 'B', ref: objA };
    objA.ref = objB;
    const outputObj = convertToRegularObject(objA);
    expect(outputObj.name).toEqual('A');
    expect(outputObj.ref.name).toEqual('B');
  });
});
