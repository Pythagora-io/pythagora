const fs = require('fs');
const path = require('path');
const { EXPORTED_TESTS_DIR, EXPORTED_TESTS_DATA_DIR} = require('../const/common');
const {getAllGeneratedTests} = require("../utils/common");
const {convertOldTestForGPT} = require("../utils/legacy");
const {getJestTestFromPythagoraData, getJestAuthFunction} = require("../helpers/openai");
const {testExported, testExportStartedLog} = require("../utils/cmdPrint");

async function createDefaultFiles() {
    if (!fs.existsSync('jest.config.js')) {
        fs.copyFileSync(path.join(__dirname, '../templates/jest-config.js'), './jest.config.js');
    }

    if (!fs.existsSync(`./${EXPORTED_TESTS_DIR}/jest-global-setup.js`)) {
        fs.copyFileSync(path.join(__dirname, '../templates/jest-global-setup.js'), `./${EXPORTED_TESTS_DIR}/global-setup.js`);
    }

    if (!fs.existsSync(`./${EXPORTED_TESTS_DIR}/auth.js`)) {
        await configureAuthFile();
    }
}

async function configureAuthFile() {
    let pythagoraMetadata = require('../../../../.pythagora/metadata.json');
    if (!pythagoraMetadata.exportRequirements || !pythagoraMetadata.exportRequirements.loginRoute) {
        throw new Error(`Please configure the login route in .pythagora/metadata.json`);
    }

    if (!pythagoraMetadata.exportRequirements.password) {
        throw new Error(`Please run Pythagora capture and log into your app once so Pythagora can export tests to Jest.`);
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

async function exportTest(testId) {
    await createDefaultFiles();

    let generatedTests = getAllGeneratedTests();
    let test = generatedTests.find(t => t.id === testId);
    if (!test) throw new Error(`Test with id ${testId} not found`);

    // TODO remove in the future
    test = convertOldTestForGPT(test);
    fs.writeFileSync(`./${EXPORTED_TESTS_DATA_DIR}/${testId}.json`, JSON.stringify(test.mongoQueries, null, 2));

    let gptResponse = await getJestTestFromPythagoraData(test);
    let jestTest = cleanupGPTResponse(gptResponse);

    fs.writeFileSync(`./${EXPORTED_TESTS_DIR}/${testId}.test.js`, jestTest);
    testExported(testId);
}

module.exports = {
    exportTest
};
