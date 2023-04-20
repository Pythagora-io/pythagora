const { makeTestRequest } = require('../helpers/testing.js');
const { getNegativeTestsFromGPT } = require('../helpers/openai.js');
const { logTestPassed, logDeletingTest } = require("../utils/cmdPrint");
const { REVIEW_IGNORE_KEYS } = require('../const/commands.js');
const { PYTHAGORA_TESTS_DIR, PYTHAGORA_DELIMITER } = require("../const/common.js");
const { delay } = require('../utils/common.js');

const fs = require('fs');
const {v4} = require('uuid');
const _ = require('lodash');
const args = require("../utils/argumentsCheck");
const testsFile = `./${PYTHAGORA_TESTS_DIR}/${PYTHAGORA_DELIMITER}status-negative-tests.json`;

function gptOutputToPythagoraTests(apiRequestData, negativeTestData) {
    let negativeTestRequests = [];

    for (const key in negativeTestData) {
        const keys = key.split(".");
        const negativeValues = negativeTestData[key];

        negativeValues.forEach((negativeValue) => {
            const modifiedRequestData = JSON.parse(JSON.stringify(apiRequestData));
            modifiedRequestData.id = v4();
            let obj = modifiedRequestData;

            for (let i = 0; i < keys.length - 1; i++) {
                obj = obj[keys[i]];
                if (!obj) break;
            }
            if (obj) {
                obj[keys[keys.length - 1]] = negativeValue;
                negativeTestRequests.push(modifiedRequestData);
            }
        });
    }

    return negativeTestRequests;
}

module.exports = async (maxTests, fileWithGeneratedTests) => {
    let numberOfEndpointsToProcess = parseInt(maxTests) || 1;
    await delay(2000);
    console.log('Creating negative tests using GPT...');
    let files = fs.readdirSync(`./${PYTHAGORA_TESTS_DIR}/`);
    files = files.filter(f => f[0] !== '.' && f.indexOf(PYTHAGORA_DELIMITER) === 0);
    let negativeStatusTests = [];

    if (fileWithGeneratedTests) {
        negativeStatusTests = JSON.parse(fs.readFileSync(`./${PYTHAGORA_TESTS_DIR}/${fileWithGeneratedTests}`));
    } else {
        testFilesLoop:
            for (let file of files) {
                let tests = JSON.parse(fs.readFileSync(`./${PYTHAGORA_TESTS_DIR}/${file}`));

                for (let test of tests) {
                    if (numberOfEndpointsToProcess === 0) break testFilesLoop;

                    if (!negativeStatusTests.find(t => t.endpoint === test.endpoint) &&
                        ((typeof test.body === 'object' && Object.keys(test.body).length) ||
                            (typeof test.query === 'object' && Object.keys(test.query).length))) {

                        console.log(`Generating tests for ${file.replaceAll(PYTHAGORA_DELIMITER, '/').replace('.json', '')}`);
                        numberOfEndpointsToProcess--;
                        let gptResponse = await getNegativeTestsFromGPT(test);
                        let pythagoraTests = gptOutputToPythagoraTests(test, gptResponse);
                        negativeStatusTests = negativeStatusTests.concat(pythagoraTests);
                        fs.writeFileSync(`./${PYTHAGORA_TESTS_DIR}/status-negative-tests.json`, JSON.stringify(negativeStatusTests, null, 2));
                    }
                }
            }
    }

    for (let i = 0; i < negativeStatusTests.length; i++) {
        let test = negativeStatusTests[i];
        test.headers['x-pythagora-special-test-file'] = fileWithGeneratedTests.replace('.json', '') || `${PYTHAGORA_DELIMITER}status-negative-tests`;
        let statusCode = await makeTestRequest(test, false, false, true);
        if (statusCode > 500) {
            console.error(statusCode);
        } else console.log(i, statusCode);
    }

    console.log('Finished generating negative tests.');
    global.Pythagora.exit();
};
