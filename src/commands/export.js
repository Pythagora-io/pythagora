const fs = require('fs');
const path = require('path');
const {
    EXPORTED_TESTS_DIR,
    EXPORTED_TESTS_DATA_DIR,
    PYTHAGORA_METADATA_DIR,
    METADATA_FILENAME,
    EXPORT_METADATA_FILENAME,
    SRC_TO_ROOT
} = require('../const/common');
const {getAllGeneratedTests, updateMetadata} = require("../utils/common");
const {convertOldTestForGPT} = require("../utils/legacy");
const {setUpPythagoraDirs} = require("../helpers/starting");
const {
    logAndExit,
    testExported,
    pleaseCaptureLoginTestLog,
    enterLoginRouteLog,
    testEligibleForExportLog,
    jestAuthFileGenerationLog
} = require("../utils/cmdPrint");
const {
    getJestAuthFunction,
    getJestTest,
    getJestTestName,
    isEligibleForExport,
    cleanupGPTResponse
} = require("../helpers/api");
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

function cleanupDataFolder() {
    const pythagoraTestsFolderPath = `./${EXPORTED_TESTS_DIR}`;
    const dataFolderPath = `./${EXPORTED_TESTS_DATA_DIR}`;

    try {
        // Read the files in the ./pythagora_tests/data folder
        const files = fs.readdirSync(dataFolderPath);

        files.forEach((file) => {
            const filePathInPythagoraTests = path.join(pythagoraTestsFolderPath, file.replace('.json', '.test.js'));

            // Check if the file exists in the pythagora_tests folder
            if (!fs.existsSync(filePathInPythagoraTests)) {
                // File doesn't exist in the pythagora_tests folder, so delete it from the data folder
                const filePathInData = path.join(dataFolderPath, file);
                fs.unlinkSync(filePathInData);
            }
        });
    } catch (err) {
        // console.error('Error deleting files from the data folder:', err);
    }
}

async function exportTest(originalTest, exportsMetadata) {
    let test = convertOldTestForGPT(originalTest);
    let jestTest = await getJestTest(test);
    let testName = await getJestTestName(jestTest, Object.values(exportsMetadata).map(obj => obj.testName));
    if (!jestTest && !testName) return console.error('There was issue with getting GPT response. Make sure you have access to GPT4 with your API key.');

    fs.writeFileSync(`./${EXPORTED_TESTS_DATA_DIR}/${testName.replace('.test.js', '.json')}`, JSON.stringify(test.mongoQueries, null, 2));
    fs.writeFileSync(`./${EXPORTED_TESTS_DIR}/${testName}`, jestTest.replace(test.testId, testName));

    testExported(testName);
    saveExportJson(exportsMetadata, originalTest, testName);

}

function testExists(exportsMetadata, testId) {
    return !!exportsMetadata[testId] && exportsMetadata[testId].testName && fs.existsSync(`./${EXPORTED_TESTS_DIR}/${exportsMetadata[testId].testName}`)
}

function saveExportJson(exportsMetadata, test, testName) {
    exportsMetadata[test.id] = {
        endpoint: test.endpoint,
        testName
    };
    fs.writeFileSync(`./${PYTHAGORA_METADATA_DIR}/${EXPORT_METADATA_FILENAME}`, JSON.stringify(exportsMetadata));
}

(async () => {
    setUpPythagoraDirs();
    cleanupDataFolder();
    let exportsMetadata = JSON.parse(fs.readFileSync(`./${PYTHAGORA_METADATA_DIR}/${EXPORT_METADATA_FILENAME}`));
    let generatedTests = getAllGeneratedTests();
    await createDefaultFiles(generatedTests);

    let testId = args.test_id;
    if (testId) {
        if (testExists(exportsMetadata, testId)) logAndExit(`Test with id ${testId} already generated, you can find it here: ${`./${EXPORTED_TESTS_DIR}/${exportsMetadata[testId].testName}`}. If you want to generate it again delete old one first.`);

        let originalTest = generatedTests.find(t => t.id === testId);
        if (!originalTest) throw new Error(`Test with id ${testId} not found`);

        await exportTest(originalTest, exportsMetadata);
    }
    else {
        for (let originalTest of generatedTests) {
            if (originalTest.method === 'OPTIONS') continue;
            if (testExists(exportsMetadata, originalTest.id)) {
                console.log(`Test with id ${originalTest.id} already generated, you can find it here: ${`./${EXPORTED_TESTS_DIR}/${exportsMetadata[originalTest.id].testName}`}.`);
                continue;
            }

            let test = convertOldTestForGPT(originalTest);
            const isEligible = await isEligibleForExport(test);

            if (isEligible) {
                await exportTest(originalTest, exportsMetadata);
            } else testEligibleForExportLog(originalTest.endpoint, originalTest.id, isEligible);
        }
    }

    process.exit(0);
})()
