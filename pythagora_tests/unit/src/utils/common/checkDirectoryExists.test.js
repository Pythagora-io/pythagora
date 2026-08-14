describe('checkDirectoryExists', () => {

  test('should return true when directory exists', async () => {
    const { checkDirectoryExists } = require('../../../../../src/utils/common.js');
    const fs = require('fs');

    fs.mkdirSync('test-dir');
    const exists = await checkDirectoryExists('test-dir');
    fs.rmdirSync('test-dir');

    expect(exists).toBe(true);
  });

  test('should return false when directory does not exist', async () => {
    const { checkDirectoryExists } = require('../../../../../src/utils/common.js');

    const exists = await checkDirectoryExists('nonexistent-dir');

    expect(exists).toBe(false);
  });

  test('should return false when provided path is to a file', async () => {
    const { checkDirectoryExists } = require('../../../../../src/utils/common.js');
    const fs = require('fs');

    fs.writeFileSync('test-file.txt', 'test contents');
    const exists = await checkDirectoryExists('test-file.txt');
    fs.unlinkSync('test-file.txt');

    expect(exists).toBe(false);
  });

  test('should handle null input', async () => {
    const { checkDirectoryExists } = require('../../../../../src/utils/common.js');

    await expect(checkDirectoryExists(null)).rejects.toThrow();
  });

  test('should handle undefined input', async () => {
    const { checkDirectoryExists } = require('../../../../../src/utils/common.js');

    await expect(checkDirectoryExists(undefined)).rejects.toThrow();
  });

});
