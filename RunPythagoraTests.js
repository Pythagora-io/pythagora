const { logTestsFinished, logTestsStarting } = require('./src/utils/cmdPrint.js');
const { makeTestRequest } = require('./src/helpers/testing.js');
const { getCircularReplacer } = require('./src/utils/common.js')
const { PYTHAGORA_TESTS_DIR, PYTHAGORA_METADATA_DIR, REVIEW_DATA_FILENAME } = require('./src/const/common.js');

const fs = require('fs');

(async () => {
    const startTime = new Date();
    const results = [];

    try {
        let reviewData = [];
        let files = fs.readdirSync(`./${PYTHAGORA_TESTS_DIR}/`);
        let testsToExecute = global.Pythagora.getTestsToExecute();
        if (testsToExecute && !testsToExecute.length) throw new Error('There are no tests to execute. Check if you put arguments in Pythagora command correctly.');

        files = files.filter(f => f[0] !== '.');
        logTestsStarting(files);
        for (let file of files) {
            if (file[0] !== '|') continue;
            let tests = JSON.parse(fs.readFileSync(`./${PYTHAGORA_TESTS_DIR}/${file}`));
            for (let test of tests) {
                if (!testsToExecute || testsToExecute.includes(test.id)) {
                    let { testResult, reviewJson } = await makeTestRequest(test);
                    if (Object.keys(reviewJson).length) {
                        reviewJson.id = test.id;
                        reviewJson.filename = file;
                    }

                    if (!testResult) reviewData.push(reviewJson);
                    results.push(testResult || false);
                }
            }
        }

        let passedCount = results.filter(r => r).length,
            failedCount = results.filter(r => !r).length;
        logTestsFinished(passedCount, failedCount);

        if (reviewData.length) fs.writeFileSync(`./${PYTHAGORA_METADATA_DIR}/${REVIEW_DATA_FILENAME}`, JSON.stringify(reviewData, getCircularReplacer(), 2));
        console.log(`Time it took to run all Pythagora tests: \x1b[32m${((new Date() - startTime)/1000).toFixed(2)}s\x1b[0m`);
    } catch (err) {
        console.error("Error occured while running Pythagora tests: ", err);
    }

    global.Pythagora.exit();
})();
