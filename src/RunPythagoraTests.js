const { logTestsFinished, logTestStarting, logTestsStarting } = require('./utils/cmdPrint.js');
const { makeTestRequest } = require('./helpers/testing.js');
const { getCircularReplacer } = require('./utils/common.js')
const { PYTHAGORA_METADATA_DIR, REVIEW_DATA_FILENAME, PYTHAGORA_DELIMITER, PYTHAGORA_TESTS_DIR } = require("@pythagora.io/js-code-processing").common;

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const {getAllGeneratedTests} = require("./utils/common");

let Pythagora = global.Pythagora;

function openFullCodeCoverageReport() {
    let fullCodeCoverageReportPath = `./pythagora_tests/code_coverage_report/lcov-report/index.html`;

    if (Pythagora.fullCodeCoverageReport && fs.existsSync(fullCodeCoverageReportPath)) {
        console.log(`\nYou can find full code coverage report here: \x1b[34m${fullCodeCoverageReportPath}\x1b[0m`);
        exec(`open ${fullCodeCoverageReportPath}`, (err, stdout, stderr) => {
            Pythagora.exit();
        });
    }
}

async function runTests(tests, testsToExecute) {
    let results = [];
    let reviewData = [];

    for (let test of tests) {
        let { testResult, reviewJson } = await makeTestRequest(test);
        if (Object.keys(reviewJson).length) {
            reviewJson.id = test.id;
            reviewJson.filename = test.endpoint.replace(/\//g, PYTHAGORA_DELIMITER) + '.json';
        }

        if (!testResult) reviewData.push(reviewJson);
        results.push(testResult || false);
    }

    return { results, reviewData };
}

function updateReviewFile(testsToExecute, reviewData) {
    let reviewFilePath = path.resolve(Pythagora.pythagora_root, PYTHAGORA_METADATA_DIR, REVIEW_DATA_FILENAME);
    let oldReviewData = [];

    if (testsToExecute && fs.existsSync(reviewFilePath)) {
        oldReviewData = fs.readFileSync(reviewFilePath);
        oldReviewData = JSON.parse(oldReviewData);
        oldReviewData = oldReviewData.filter((test) => !testsToExecute.includes(test.id));
    }
    fs.writeFileSync(reviewFilePath, JSON.stringify(oldReviewData.concat(reviewData), getCircularReplacer(), 2));
}

(async () => {
    let error;
    try {
        const startTime = new Date();
        let pythagoraTests = getAllGeneratedTests();
        let testsToExecute = Pythagora.getTestsToExecute();
        if (testsToExecute && !testsToExecute.length) throw new Error('There are no tests to execute. Check if you put arguments in Pythagora command correctly.');

        Pythagora.testId ? logTestStarting(Pythagora.testId) : logTestsStarting(fs.readdirSync(path.resolve(Pythagora.pythagora_root, PYTHAGORA_TESTS_DIR)));
        pythagoraTests = pythagoraTests.filter(t => !testsToExecute || testsToExecute.includes(t.id));
        let { results, reviewData } = await runTests(pythagoraTests);

        let passedCount = results.filter(r => r).length,
            failedCount = results.filter(r => !r).length;
        logTestsFinished(passedCount, failedCount);

        updateReviewFile(testsToExecute, reviewData);
        console.log(`Time it took to run all Pythagora tests: \x1b[32m${((new Date() - startTime)/1000).toFixed(2)}s\x1b[0m`);

        openFullCodeCoverageReport();
    } catch (e) {
        error = e;
        console.error("Error occured while running Pythagora tests: ", error);
    }

    if (!Pythagora.fullCodeCoverageReport || error) Pythagora.exit();
})();
