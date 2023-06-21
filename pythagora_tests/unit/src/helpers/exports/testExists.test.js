const { testExists } = require('../../../../../src/helpers/exports');
const fs = require('fs');
const path = require('path');
const { EXPORTED_TESTS_DIR } = require('../../../../src/const/common');

describe('testExists', () => {
  test('should return true if test exists with valid testName and testId', () => {
    // Mock fs.existsSync to return true
    jest.spyOn(fs, 'existsSync').mockReturnValueOnce(true);

    const exportsMetadata = {
      testId_123: {
        testName: 'testName_123'
      }
    };
    const testId = 'testId_123';

    const result = testExists(exportsMetadata, testId);

    expect(result).toBe(true);
    expect(fs.existsSync).toHaveBeenCalledWith(`./${EXPORTED_TESTS_DIR}/${exportsMetadata[testId].testName}`);
  });

  test('should return false if exportsMetadata is empty', () => {
    const exportsMetadata = {};
    const testId = 'testId_123';

    const result = testExists(exportsMetadata, testId);

    expect(result).toBe(false);
  });

  test('should return false if testName is missing', () => {
    const exportsMetadata = {
      testId_123: {}
    };
    const testId = 'testId_123';

    const result = testExists(exportsMetadata, testId);

    expect(result).toBe(false);
  });

  test('should return false if test file does not exist', () => {
    // Mock fs.existsSync to return false
    jest.spyOn(fs, 'existsSync').mockReturnValueOnce(false);

    const exportsMetadata = {
      testId_123: {
        testName: 'testName_123'
      }
    };
    const testId = 'testId_123';

    const result = testExists(exportsMetadata, testId);

    expect(result).toBe(false);
    expect(fs.existsSync).toHaveBeenCalledWith(`./${EXPORTED_TESTS_DIR}/${exportsMetadata[testId].testName}`);
  });
});