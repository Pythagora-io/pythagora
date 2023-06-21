const { runExport } = require('../../../../../src/commands/export.js')
const api = require('../../../../../src/helpers/api.js')
const starting = require('../../../../../src/helpers/starting.js')
const exportsHelpers = require('../../../../../src/helpers/exports.js')
const common = require('../../../../../src/utils/common.js')
const cmdPrint = require('../../../../../src/utils/cmdPrint.js')
const legacy = require('../../../../../src/utils/legacy.js')

const fs = require('fs')
const getArgsMock = jest.fn();
jest.mock('fs')

const axios = require('axios')
jest.mock('axios')

jest.mock('../../../../../src/utils/getArgs', () => jest.fn({}))

describe('runExport', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  test('testId exists and test already generated', async () => {
    const apiKey = 'testKey'
    const testId = 'test1'
    getArgsMock.mockReturnValueOnce({
      pythagora_api_key: apiKey,
      test_id: testId
    });
    // jest.mock('../../../../../src/utils/getArgs', () => ({
    //   pythagora_api_key: apiKey,
    //   test_id: testId
    // }))
    fs.readdirSync.mockReturnValue([])
    fs.readFileSync.mockReturnValue(JSON.stringify({ [testId]: { testName: 'testName.test.js' } }))
    exportsHelpers.testExists.mockReturnValue(true)

    await runExport()

    expect(cmdPrint.logAndExit).toHaveBeenCalledWith(`Test with id ${testId} already generated, you can find it here: ./${'./tests/generated/testName.test.js'}. If you want to generate it again delete old one first.`)
  })

  test('testId exists but test not found', async () => {
    const apiKey = 'testKey'
    const testId = 'notfound'
    getArgsMock.mockReturnValueOnce({
      pythagora_api_key: apiKey,
      test_id: testId
    });
    // jest.mock('../../../../../src/utils/getArgs', () => ({
    //   pythagora_api_key: apiKey,
    //   test_id: testId
    // }))
    fs.readdirSync.mockReturnValue([])
    fs.readFileSync.mockReturnValue('{}')
    exportsHelpers.testExists.mockReturnValue(false)
    common.getAllGeneratedTests.mockReturnValue([])

    await expect(runExport()).rejects.toThrow(`Test with id ${testId} not found`)
  })

  test('testId not provided, OPTIONS method', async () => {
    const apiKey = 'testKey'
    const testId = undefined
    getArgsMock.mockReturnValueOnce({
      pythagora_api_key: apiKey,
      test_id: testId
    });
    // jest.mock('../../../../../src/utils/getArgs', () => ({
    //   pythagora_api_key: apiKey,
    //   test_id: testId
    // }))
    fs.readdirSync.mockReturnValue([])
    fs.readFileSync.mockReturnValue('{}')
    common.getAllGeneratedTests.mockReturnValue([{ method: 'OPTIONS', id: 'test1' }])

    await runExport()

    expect(exportsHelpers.testExists).not.toHaveBeenCalled()
    expect(legacy.convertOldTestForGPT).not.toHaveBeenCalled()
    expect(api.isEligibleForExport).not.toHaveBeenCalled()
    expect(exportsHelpers.exportTest).not.toHaveBeenCalled()
    expect(cmdPrint.testEligibleForExportLog).not.toHaveBeenCalled()
  })

  test('testId not provided, test already generated', async () => {
    const apiKey = 'testKey'
    const testId = undefined
    getArgsMock.mockReturnValueOnce({
      pythagora_api_key: apiKey,
      test_id: testId
    });
    // jest.mock('../../../../../src/utils/getArgs', () => ({
    //   pythagora_api_key: apiKey,
    //   test_id: testId
    // }))
    fs.readdirSync.mockReturnValue([])
    fs.readFileSync.mockReturnValue(JSON.stringify({ test1: { testName: 'testName.test.js' } }))
    common.getAllGeneratedTests.mockReturnValue([{ method: 'GET', id: 'test1', endpoint: '/example' }])
    exportsHelpers.testExists.mockReturnValue(true)

    await runExport()

    expect(exportsHelpers.testExists).toHaveBeenCalledWith({ testName: 'testName.test.js' }, 'test1')
    expect(legacy.convertOldTestForGPT).not.toHaveBeenCalled()
    expect(api.isEligibleForExport).not.toHaveBeenCalled()
    expect(exportsHelpers.exportTest).not.toHaveBeenCalled()
    expect(cmdPrint.testEligibleForExportLog).not.toHaveBeenCalled()
    expect(console.log).toHaveBeenCalledWith(`Test with id test1 already generated, you can find it here: ./${'./tests/generated/testName.test.js'}.`)
  })

  test('testId not provided, test not eligible for export', async () => {
    const apiKey = 'testKey'
    const testId = undefined
    const originalTest = { method: 'GET', id: 'test1', endpoint: '/example' }
    const convertedTest = { ...originalTest, testId: 'test1' }
    getArgsMock.mockReturnValueOnce({
      pythagora_api_key: apiKey,
      test_id: testId
    });
    // jest.mock('../../../../../src/utils/getArgs', () => ({
    //   pythagora_api_key: apiKey,
    //   test_id: testId
    // }))
    fs.readdirSync.mockReturnValue([])
    fs.readFileSync.mockReturnValue('{}')
    common.getAllGeneratedTests.mockReturnValue([originalTest])
    exportsHelpers.testExists.mockReturnValue(false)
    legacy.convertOldTestForGPT.mockReturnValue(convertedTest)
    api.isEligibleForExport.mockResolvedValue(false)

    await runExport()

    expect(exportsHelpers.testExists).toHaveBeenCalledWith({}, 'test1')
    expect(legacy.convertOldTestForGPT).toHaveBeenCalledWith(originalTest)
    expect(api.isEligibleForExport).toHaveBeenCalledWith(convertedTest)
    expect(exportsHelpers.exportTest).not.toHaveBeenCalled()
    expect(cmdPrint.testEligibleForExportLog).toHaveBeenCalledWith('/example', 'test1', false)
  })

  test('testId not provided, test eligible for export', async () => {
    const apiKey = 'testKey'
    const testId = undefined
    const originalTest = { method: 'GET', id: 'test1', endpoint: '/example' }
    const convertedTest = { ...originalTest, testId: 'test1' }
    getArgsMock.mockReturnValueOnce({
      pythagora_api_key: apiKey,
      test_id: testId
    });
    // jest.mock('../../../../../src/utils/getArgs', () => ({
    //   pythagora_api_key: apiKey,
    //   test_id: testId
    // }))
    fs.readdirSync.mockReturnValue([])
    fs.readFileSync.mockReturnValue('{}')
    common.getAllGeneratedTests.mockReturnValue([originalTest])
    exportsHelpers.testExists.mockReturnValue(false)
    legacy.convertOldTestForGPT.mockReturnValue(convertedTest)
    api.isEligibleForExport.mockResolvedValue(true)
    exportsHelpers.exportTest.mockResolvedValue()

    await runExport()

    expect(exportsHelpers.testExists).toHaveBeenCalledWith({}, 'test1')
    expect(legacy.convertOldTestForGPT).toHaveBeenCalledWith(originalTest)
    expect(api.isEligibleForExport).toHaveBeenCalledWith(convertedTest)
    expect(exportsHelpers.exportTest).toHaveBeenCalledWith(originalTest, {})
  })
})