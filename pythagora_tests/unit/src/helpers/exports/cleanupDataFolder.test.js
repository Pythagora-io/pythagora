describe('cleanupDataFolder', () => {
  const fs = require('fs');
  const path = require('path');
  const { cleanupDataFolder } = require('../../../../../src/helpers/exports.js');
  const { EXPORTED_TESTS_DIR, EXPORTED_TESTS_DATA_DIR } = require('../../../../../src/const/common');

  test('should delete file from data folder if not existing in pythagora_tests folder', () => {
    jest.spyOn(fs, 'readdirSync').mockReturnValueOnce(['file1.json']);
    jest.spyOn(fs, 'existsSync').mockReturnValueOnce(false);
    const unlinkSyncSpy = jest.spyOn(fs, 'unlinkSync').mockImplementationOnce(jest.fn());

    cleanupDataFolder();

    expect(unlinkSyncSpy).toHaveBeenCalledWith(path.join(`./${EXPORTED_TESTS_DATA_DIR}`, 'file1.json'));
  });

  test('should not delete file from data folder if existing in pythagora_tests folder', () => {
    jest.spyOn(fs, 'readdirSync').mockReturnValueOnce(['file2.json']);
    jest.spyOn(fs, 'existsSync').mockReturnValueOnce(true);
    const unlinkSyncSpy = jest.spyOn(fs, 'unlinkSync').mockImplementationOnce(jest.fn());

    cleanupDataFolder();

    expect(unlinkSyncSpy).not.toHaveBeenCalled();
  });

  test('should not throw error if readdirSync fails', () => {
    jest.spyOn(fs, 'readdirSync').mockImplementationOnce(() => { throw new Error() });
    jest.spyOn(fs, 'existsSync');
    const unlinkSyncSpy = jest.spyOn(fs, 'unlinkSync');

    expect(() => cleanupDataFolder()).not.toThrow();

    expect(unlinkSyncSpy).not.toHaveBeenCalled();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
});