describe('Create Default Files', () => {
  const fs = require('fs');
  const path = require('path');
  const { createDefaultFiles } = require('../../../../../src/helpers/exports.js');
  const args = ['--globalSetup', '../../jest-global-setup.js'];
  let generatedTests;
  beforeEach(() => {
    jest.resetModules();

    const templatePath = path.join(__dirname, '../templates/jest-global-setup.js');
    const fsMock = {
      [src]: 'jest.config.js',
      [dst]: '',
    };

    fs.readlink.mockImplementation((src, type) => {
      return fsMock[src];
    });

    generatedTests = [
      {
        endpoint: '/api/login',
        method: 'POST',
        intermediateData: [],
        body: {},
      },
    ];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Create jest-global-setup.js on first run', async () => {
    expect.assertions(1);
    fs.existsSync.mockReturnValue(false);
    await createDefaultFiles(generatedTests);
    expect(fs.copyFileSync).toHaveBeenCalledTimes(1);
  });

  test('Skips copying default files on subsequent runs', async () => {
    expect.assertions(1);
    fs.existsSync.mockReturnValue(true);
    await createDefaultFiles(generatedTests);
    expect(fs.copyFileSync).toHaveBeenCalledTimes(0);
  });

  test('Create jest.config.js if it does not exist', async () => {
    expect.assertions(2);
    fs.existsSync.mockReturnValue(false);
    await createDefaultFiles(generatedTests);
    expect(fs.copyFileSync).toHaveBeenCalledTimes(1);
    expect(fs.copyFileSync).toHaveBeenCalledWith(expect.any(String), './jest.config.js');
  });

  test('Skips copying jest.config.js on subsequent runs', async () => {
    expect.assertions(2);
    fs.existsSync.mockReturnValue(true);
    await createDefaultFiles(generatedTests);
    expect(fs.copyFileSync).toHaveBeenCalledTimes(0);
  });

});
