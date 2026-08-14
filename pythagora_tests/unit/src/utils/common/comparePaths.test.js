describe('comparePaths', () => {

  test('comparePaths: identical paths', () => {
    const { comparePaths } = require('../../../../../src/utils/common.js');
    expect(comparePaths('/test/path', '/test/path')).toBeTruthy();
  });

  test('comparePaths: different paths', () => {
    const { comparePaths } = require('../../../../../src/utils/common.js');
    expect(comparePaths('/test/path', '/test/another-path')).toBeFalsy();
  });

  test('comparePaths: leading slash in path1', () => {
    const { comparePaths } = require('../../../../../src/utils/common.js');
    expect(comparePaths('/test/path', 'test/path')).toBeTruthy();
  });

  test('comparePaths: leading slash in path2', () => {
    const { comparePaths } = require('../../../../../src/utils/common.js');
    expect(comparePaths('test/path', '/test/path')).toBeTruthy();
  });

  test('comparePaths: trailing slash in path1', () => {
    const { comparePaths } = require('../../../../../src/utils/common.js');
    expect(comparePaths('test/path/', 'test/path')).toBeTruthy();
  });

  test('comparePaths: trailing slash in path2', () => {
    const { comparePaths } = require('../../../../../src/utils/common.js');
    expect(comparePaths('test/path', 'test/path/')).toBeTruthy();
  });

  test('comparePaths: empty paths', () => {
    const { comparePaths } = require('../../../../../src/utils/common.js');
    expect(comparePaths('', '')).toBeTruthy();
  });

  test('comparePaths: path1 empty, path2 not empty', () => {
    const { comparePaths } = require('../../../../../src/utils/common.js');
    expect(comparePaths('', 'test/path')).toBeFalsy();
  });

  test('comparePaths: path1 not empty, path2 empty', () => {
    const { comparePaths } = require('../../../../../src/utils/common.js');
    expect(comparePaths('test/path', '')).toBeFalsy();
  });

});