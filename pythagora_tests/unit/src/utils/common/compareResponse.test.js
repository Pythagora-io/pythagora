describe('compareResponse tests', () => {
  test('Should return true for two equal numbers', () => {
    const { compareResponse } = require('../../../../../src/utils/common.js');
    expect(compareResponse(42, 42)).toBe(true);
  });

  test('Should return true for two equal strings', () => {
    const { compareResponse } = require('../../../../../src/utils/common.js');
    expect(compareResponse('hello', 'hello')).toBe(true);
  });

  test('Should return false for unequal strings', () => {
    const { compareResponse } = require('../../../../../src/utils/common.js');
    expect(compareResponse('hello', 'world')).toBe(false);
  });

  test('Should return true for two identical objects', () => {
    const { compareResponse } = require('../../../../../src/utils/common.js');
    const objA = { key: 'value' };
    const objB = { key: 'value' };
    expect(compareResponse(objA, objB)).toBe(true);
  });

  test('Should return false for two different objects', () => {
    const { compareResponse } = require('../../../../../src/utils/common.js');
    const objA = { key: 'value' };
    const objB = { key: 'otherValue' };
    expect(compareResponse(objA, objB)).toBe(false);
  });

  test('Should return false for different types', () => {
    const { compareResponse } = require('../../../../../src/utils/common.js');
    expect(compareResponse('42', 42)).toBe(false);
  });

  test('Should return true for two html strings', () => {
    const { compareResponse } = require('../../../../../src/utils/common.js');
    const htmlA = '<!doctype html><html><head><title>Hello</title></head><body><h1>Hello world!</h1></body></html>';
    const htmlB = '<!doctype html><html><head><title>Hello</title></head><body><h1>Hello world!</h1></body></html>';
    expect(compareResponse(htmlA, htmlB)).toBe(true);
  });

  test('Should return false for one html string and one non-html string', () => {
    const { compareResponse } = require('../../../../../src/utils/common.js');
    const htmlA = '<!doctype html><html><head><title>Hello</title></head><body><h1>Hello world!</h1></body></html>';
    const strB = 'Hello world!';
    expect(compareResponse(htmlA, strB)).toBe(false);
  });

  test('Should return true for two arrays with identical objects', () => {
    const { compareResponse } = require('../../../../../src/utils/common.js');
    const arrA = [{ key: 'value' }, { key: 'otherValue' }];
    const arrB = [{ key: 'otherValue' }, { key: 'value' }];
    expect(compareResponse(arrA, arrB)).toBe(true);
  });

  test('Should return false for two arrays with different objects', () => {
    const { compareResponse } = require('../../../../../src/utils/common.js');
    const arrA = [{ key: 'value' }, { key: 'otherValue' }];
    const arrB = [{ key: 'unmatchedValue' }, { key: 'value' }];
    expect(compareResponse(arrA, arrB)).toBe(false);
  });
});