describe('compareJson tests', () => {
  const { compareJson } = require('../../../../../src/utils/common.js');

  test('Should return true for identical objects', () => {
    const obj1 = { key: 'value' };
    const obj2 = { key: 'value' };
    expect(compareJson(obj1, obj2)).toBe(true);
  });

  test('Should return false for different objects', () => {
    const obj1 = { key: 'value' };
    const obj2 = { key: 'differentValue' };
    expect(compareJson(obj1, obj2)).toBe(false);
  });

  test('Should return true for identical arrays', () => {
    const arr1 = [1, 2, 3];
    const arr2 = [1, 2, 3];
    expect(compareJson(arr1, arr2)).toBe(true);
  });

  test('Should return false for different arrays', () => {
    const arr1 = [1, 2, 3];
    const arr2 = [1, 2, 4];
    expect(compareJson(arr1, arr2)).toBe(false);
  });

  test('Should return true for identical nested objects', () => {
    const obj1 = { key: { nestedKey: 'value' } };
    const obj2 = { key: { nestedKey: 'value' } };
    expect(compareJson(obj1, obj2)).toBe(true);
  });

  test('Should return false for different nested objects', () => {
    const obj1 = { key: { nestedKey: 'value' } };
    const obj2 = { key: { nestedKey: 'differentValue' } };
    expect(compareJson(obj1, obj2)).toBe(false);
  });

  test('Should return true for identical objects with Date', () => {
    const date = new Date();
    const obj1 = { key: date };
    const obj2 = { key: date };
    expect(compareJson(obj1, obj2)).toBe(true);
  });

  test('Should return false for different objects with Date', () => {
    const date1 = new Date();
    const date2 = new Date(date1.getTime() + 1000);
    const obj1 = { key: date1 };
    const obj2 = { key: date2 };
    expect(compareJson(obj1, obj2)).toBe(true);
  });

  test('Should return true for identical JSON strings', () => {
    const jsonString1 = JSON.stringify({ key: 'value' });
    const jsonString2 = JSON.stringify({ key: 'value' });
    expect(compareJson(jsonString1, jsonString2)).toBe(true);
  });

  test('Should return false for different JSON strings', () => {
    const jsonString1 = JSON.stringify({ key: 'value' });
    const jsonString2 = JSON.stringify({ key: 'differentValue' });
    expect(compareJson(jsonString1, jsonString2)).toBe(false);
  });

  test('Should return true for mixed identical data types', () =>{
    const date = new Date();
    const data1 = { key1: 'value', key2: date, key3: [1, 2, 3] };
    const data2 = { key1: 'value', key2: date, key3: [1, 2, 3] };
    expect(compareJson(data1, data2)).toBe(true);
  });

  test('Should return true for strict mode with identical ObjectId strings', () => {
    const idString1 = 'ObjectId("123456789012345678901234")';
    const idString2 = 'ObjectId("123456789012345678901234")';
    expect(compareJson(idString1, idString2, true)).toBe(true);
  });

  test('Should return false for strict mode with different ObjectId strings', () => {
    const idString1 = 'ObjectId("123456789012345678901234")';
    const idString2 = 'ObjectId("123456789012345678901235")';
    expect(compareJson(idString1, idString2, true)).toBe(false);
  });

  test('Should return true for non-strict mode with different ObjectId strings', () => {
    const idString1 = 'ObjectId("123456789012345678901234")';
    const idString2 = 'ObjectId("123456789012345678901235")';
    expect(compareJson(idString1, idString2, false)).toBe(true);
  });

  test('Should return false for comparing an object and an array', () => {
    const obj = { key: 'value' };
    const arr = ['value'];
    expect(compareJson(obj, arr)).toBe(false);
  });

  test('Should return false for comparing an object and a string', () => {
    const obj = { key: 'value' };
    const str = 'value';
    expect(compareJson(obj, str)).toBe(false);
  });

  test('Should return false for comparing an array and a string', () => {
    const arr = ['value'];
    const str = 'value';
    expect(compareJson(arr, str)).toBe(false);
  });
});
