const { logTestsFinished, logTestsStarting } = require('./utils/cmdPrint.js');
const { makeTestRequest } = require('./helpers/testing.js');
const { getCircularReplacer } = require('./utils/common.js')
const { PYTHAGORA_TESTS_DIR, PYTHAGORA_METADATA_DIR, REVIEW_DATA_FILENAME, PYTHAGORA_DELIMITER } = require('./const/common.js');

const fs = require('fs');
const { exec } = require('child_process');

function openFullCodeCoverageReport() {
    let fullCodeCoverageReportPath = `./pythagora_tests/code_coverage_report/lcov-report/index.html`;

    if (global.Pythagora.fullCodeCoverageReport && fs.existsSync(fullCodeCoverageReportPath)) {
        console.log(`\nYou can find full code coverage report here: \x1b[34m${fullCodeCoverageReportPath}\x1b[0m`);
        exec(`open ${fullCodeCoverageReportPath}`, (err, stdout, stderr) => {
            global.Pythagora.exit();
        });
    }
}

async function runTests(files, testsToExecute) {
    let results = [];
    let reviewData = [];

    for (let file of files) {
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

    return { results, reviewData };
}

function updateReviewFile(testsToExecute, reviewData) {
    let reviewFilePath = `./${PYTHAGORA_METADATA_DIR}/${REVIEW_DATA_FILENAME}`;
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
        let files = fs.readdirSync(`./${PYTHAGORA_TESTS_DIR}/`);
        let testsToExecute = global.Pythagora.getTestsToExecute();
        if (testsToExecute && !testsToExecute.length) throw new Error('There are no tests to execute. Check if you put arguments in Pythagora command correctly.');

        files = files.filter(f => f[0] !== '.' && f.indexOf(PYTHAGORA_DELIMITER) === 0);
        logTestsStarting(files);

        let { results, reviewData } = await runTests(files, testsToExecute);

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

    if (!global.Pythagora.fullCodeCoverageReport || error) global.Pythagora.exit();
})();
