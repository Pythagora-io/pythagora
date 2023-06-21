describe('configureAuthFile tests', () => {
  const { configureAuthFile } = require('../../../../../src/helpers/exports.js');
  const { updateMetadata } = require('../../../../../src/utils/common.js');
  const fs = require('fs');
  const originalExit = process.exit;
  const originalConsoleLog = console.log;
  const originalWriteFileSync = fs.writeFileSync;

  afterEach(() => {
    process.exit = originalExit;
    console.log = originalConsoleLog;
    fs.writeFileSync = originalWriteFileSync;
  });

  test('configureAuthFile with valid loginPath and loginRequestBody, loginMongoQueries', async () => {
    const generatedTests = [
      {
        endpoint: '/test_login_path',
        method: 'POST',
        body: { key: 'value' },
        intermediateData: [{ type: 'mongodb' }]
      }
    ];

    const mockExit = jest.fn();
    process.exit = mockExit;

    const mockConsoleLog = jest.fn();
    console.log = mockConsoleLog;

    const mockWriteFileSync = jest.fn();
    fs.writeFileSync = mockWriteFileSync;

    jest.mock('../../../../../src/helpers/api.js', () => ({
      getJestAuthFunction: () => Promise.resolve('mocked_gpt_response\n```\n\nmocked_gpt_response\n```')
    }));

    jest.mock('../../../../../src/utils/common.js', () => ({
      ...jest.requireActual('../../../../../src/utils/common.js'),
      updateMetadata: jest.fn()
    }));

    await configureAuthFile(generatedTests);

    expect(updateMetadata).toHaveBeenCalled();
    expect(mockExit).not.toHaveBeenCalled();
    expect(mockConsoleLog).not.toHaveBeenCalledWith(expect.stringContaining('To export test to Jest, Pythagora needs a captured test'));
    expect(mockWriteFileSync).toHaveBeenCalledWith(expect.stringMatching(/\/auth\.js$/), 'mocked_gpt_response');
  });

  test('configureAuthFile without loginPath in metadata', async () => {
    const generatedTests = [];

    const mockExit = jest.fn();
    process.exit = mockExit;

    const mockConsoleLog = jest.fn();
    console.log = mockConsoleLog;

    await configureAuthFile(generatedTests);

    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Login endpoint path not found'));
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  test('configureAuthFile with loginPath but missing loginRequestBody or loginMongoQueries', async () => {
    const generatedTests = [
      {
        endpoint: '/missing_login_test',
        method: 'POST',
      }
    ];

    const mockExit = jest.fn();
    process.exit = mockExit;

    const mockConsoleLog = jest.fn();
    console.log = mockConsoleLog;

    await configureAuthFile(generatedTests);

    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('To export test to Jest, Pythagora needs a captured test'));
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});