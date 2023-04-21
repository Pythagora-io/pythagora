const fs = require('fs');
const path = require('path');
const { EXPORTED_TESTS_DIR, EXPORTED_TESTS_DATA_DIR} = require('../const/common');
const {getAllGeneratedTests} = require("../utils/common");
const {convertOldTestForGPT} = require("../utils/legacy");
const {getJestTestFromPythagoraData} = require("../helpers/openai");
const {testExported} = require("../utils/cmdPrint");

function createDefaultFiles() {
    if (!fs.existsSync('jest.config.js')) {
        fs.copyFileSync(path.join(__dirname, '../templates/jest-config.js'), './jest.config.js');
    }

    if (!fs.existsSync(`./${EXPORTED_TESTS_DIR}/jest-global-setup.js`)) {
        fs.copyFileSync(path.join(__dirname, '../templates/jest-global-setup.js'), `./${EXPORTED_TESTS_DIR}/global-setup.js`);
    }
}

function configureAuthFile() {
    // TODO
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
    createDefaultFiles();

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
