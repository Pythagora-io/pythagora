const fs = require('fs');
const path = require('path');
const {
    EXPORTED_TESTS_DIR,
    PYTHAGORA_METADATA_DIR,
    EXPORT_METADATA_FILENAME,
} = require('../const/common');
const { getAllGeneratedTests } = require("../utils/common");
const { convertOldTestForGPT } = require("../utils/legacy");
const { setUpPythagoraDirs } = require("../helpers/starting");
const {
    logAndExit,
    testEligibleForExportLog,
} = require("../utils/cmdPrint");
const {
    isEligibleForExport,
    checkForAPIKey
} = require("../helpers/api");
const args = require('../utils/getArgs.js');
const {
    createDefaultFiles,
    cleanupDataFolder,
    exportTest,
    testExists,
} = require('../helpers/exports');

async function runExport() {
    checkForAPIKey();
    setUpPythagoraDirs();
    cleanupDataFolder();
    let exportsMetadata = JSON.parse(fs.readFileSync(path.resolve(args.pythagora_root, PYTHAGORA_METADATA_DIR, EXPORT_METADATA_FILENAME)));
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
};

module.exports = {
    runExport
};
