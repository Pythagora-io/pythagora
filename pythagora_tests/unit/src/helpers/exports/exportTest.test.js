describe('exportTest', () => {
  const fs = require('fs');
  const {
    exportTest,
    saveExportJson
  } = require('../../../../../src/helpers/exports.js');
  const {
    convertOldTestForGPT
  } = require('../../../../../src/utils/legacy.js');
  const {
    getJestTest,
    getJestTestName
  } = require('../../../../../src/helpers/api.js');
  const {
    testExportStartedLog,
    testExported
  } = require('../../../../../src/utils/cmdPrint.js');

  beforeEach(() => {
    fs.writeFileSync = jest.fn();
    jest.spyOn(fs, 'writeFileSync');
    jest.spyOn(getJestTest, 'mockReturnValue');
    jest.spyOn(getJestTestName, 'mockReturnValue');
    jest.spyOn(convertOldTestForGPT, 'mockReturnValue');
    jest.spyOn(testExportStartedLog, 'mockReturnValue');
    jest.spyOn(testExported, 'mockReturnValue');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('successful export', async () => {
    const originalTest = {
      id: 'test-1',
      endpoint: 'GET /dummy',
      response: {}
    };
    const exportsMetadata = {
      'test-1': {
        endpoint: 'GET /dummy',
        testName: 'dummy.test.js'
      }
    };
    const testName = 'dummy.test.js';
    const jestTest = '// jest test';

    getJestTest.mockReturnValue(jestTest);
    getJestTestName.mockReturnValue(testName);

    await exportTest(originalTest, exportsMetadata);

    expect(testExportStartedLog).toHaveBeenCalled();
    expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
    expect(testExported).toHaveBeenCalledWith(testName);
    expect(saveExportJson).toHaveBeenCalledWith(exportsMetadata, originalTest, testName);
  });

  test('GPT response issue', async () => {
    const originalTest = {
      id: 'test-2',
      endpoint: 'GET /dummy',
      response: {}
    };
    const exportsMetadata = {};
    const testName = null;
    const jestTest = null;

    getJestTest.mockReturnValue(jestTest);
    getJestTestName.mockReturnValue(testName);

    await exportTest(originalTest, exportsMetadata);

    expect(testExportStartedLog).toHaveBeenCalled();
    expect(fs.writeFileSync).not.toHaveBeenCalled();
    expect(testExported).not.toHaveBeenCalled();
    expect(saveExportJson).not.toHaveBeenCalled();
  });
});