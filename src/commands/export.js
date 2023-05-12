const fs = require('fs');
const path = require('path');
const {
    EXPORTED_TESTS_DIR,
    EXPORTED_TESTS_DATA_DIR,
    METADATA_FILENAME,
    SRC_TO_ROOT,
    MIN_TOKENS_FOR_GPT_RESPONSE,
    MAX_GPT_MODEL_TOKENS
} = require('../const/common');
const {getAllGeneratedTests, updateMetadata} = require("../utils/common");
const {convertOldTestForGPT} = require("../utils/legacy");
const {getJestTestFromPythagoraData, getJestAuthFunction, getTokensInMessages, getPromptFromFile} = require("../helpers/openai");
const {setUpPythagoraDirs} = require("../helpers/starting");
const {testExported, pleaseCaptureLoginTestLog, enterLoginRouteLog, testEligibleForExportLog} = require("../utils/cmdPrint");
const _ = require('lodash');
const args = require('../utils/getArgs.js');

async function createDefaultFiles(generatedTests) {
    if (!fs.existsSync('jest.config.js')) {
        fs.copyFileSync(path.join(__dirname, '../templates/jest-config.js'), './jest.config.js');
    }

    if (!fs.existsSync(`./${EXPORTED_TESTS_DIR}/jest-global-setup.js`)) {
        fs.copyFileSync(path.join(__dirname, '../templates/jest-global-setup.js'), `./${EXPORTED_TESTS_DIR}/global-setup.js`);
    }

    if (!fs.existsSync(`./${EXPORTED_TESTS_DIR}/auth.js`)) {
        await configureAuthFile(generatedTests);
    }
}

async function configureAuthFile(generatedTests) {
    // TODO make require path better
    let pythagoraMetadata = require(`../${SRC_TO_ROOT}.pythagora/${METADATA_FILENAME}`);
    let loginPath = _.get(pythagoraMetadata, 'exportRequirements.login.endpointPath');
    let loginRequestBody = _.get(pythagoraMetadata, 'exportRequirements.login.requestBody');
    let loginMongoQueries = _.get(pythagoraMetadata, 'exportRequirements.login.mongoQueriesArray');

    if (!loginPath) {
        enterLoginRouteLog();
        process.exit(1);
    }

    if (!loginRequestBody || !loginMongoQueries) {
        let loginTest = generatedTests.find(t => t.endpoint === loginPath && t.method !== 'OPTIONS');
        if (loginTest) {
            _.set(pythagoraMetadata, 'exportRequirements.login.mongoQueriesArray', loginTest.intermediateData.filter(d => d.type === 'mongodb'));
            _.set(pythagoraMetadata, 'exportRequirements.login.requestBody', loginTest.body);
            updateMetadata(pythagoraMetadata);
        } else {
            pleaseCaptureLoginTestLog(loginPath);
            process.exit(1);
        }
    }

    let loginData = pythagoraMetadata.exportRequirements.login;
    let gptResponse = await getJestAuthFunction(loginData.mongoQueriesArray, loginData.requestBody, loginData.endpointPath);
    let code = cleanupGPTResponse(gptResponse);

    fs.writeFileSync(`./${EXPORTED_TESTS_DIR}/auth.js`, code);
}

function configurePrepareDbFile() {
    // TODO
}

function cleanupGPTResponse(gptResponse) {
    if (gptResponse.substring(0, 3) === "```") {
        gptResponse = gptResponse.substring(gptResponse.indexOf('\n') + 2, gptResponse.lastIndexOf('```'));
    }

    return gptResponse;
}

async function exportTest(originalTest) {
    // TODO remove in the future
    let test = convertOldTestForGPT(originalTest);
    fs.writeFileSync(`./${EXPORTED_TESTS_DATA_DIR}/${test.testId}.json`, JSON.stringify(test.mongoQueries, null, 2));

    let gptResponse = await getJestTestFromPythagoraData(test);
    let jestTest = cleanupGPTResponse(gptResponse);

    fs.writeFileSync(`./${EXPORTED_TESTS_DIR}/${test.testId}.test.js`, jestTest);
    testExported(test.testId);
}

(async () => {
    setUpPythagoraDirs();
    let generatedTests = getAllGeneratedTests();
    await createDefaultFiles(generatedTests);

    let testId = args.test_id;
    if (testId) {
        let test = generatedTests.find(t => t.id === testId);
        if (!test) throw new Error(`Test with id ${testId} not found`);
        await exportTest(test)
    }
    else {
        for (let test of generatedTests) {
            if (test.method === 'OPTIONS') continue;
            if (fs.existsSync(`./${EXPORTED_TESTS_DIR}/${test.id}.test.js`)) continue;
            let testData = convertOldTestForGPT(test);
            let tokens = getTokensInMessages([
                {"role": "system", "content": "You are a QA engineer and your main goal is to find ways to break the application you're testing. You are proficient in writing automated integration tests for Node.js API servers.\n" +
                        "When you respond, you don't say anything except the code - no formatting, no explanation - only code.\n" },
                {
                    "role": "user",
                    "content": getPromptFromFile('generateJestTest.txt', { testData }),
                },
            ]);

            let isEligibleForExport = (tokens + MIN_TOKENS_FOR_GPT_RESPONSE < MAX_GPT_MODEL_TOKENS);

            if (isEligibleForExport) await exportTest(test)
            else testEligibleForExportLog(test.endpoint, test.id, isEligibleForExport);
        }
    }
    process.exit(0);
})()
