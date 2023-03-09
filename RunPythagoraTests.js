const { logTestsFinished, logTestsStarting } = require('./src/utils/cmdPrint');
const { makeTestRequest } = require('./src/helpers/testing.js');
const { PYTHAGORA_TESTS_DIR } = require('./src/const/common.js');

const fs = require('fs');

(async () => {
    const startTime = new Date();
    const results = [];

    try {
        let files = fs.readdirSync(`./${PYTHAGORA_TESTS_DIR}/`);
        files = files.filter(f => f[0] !== '.');
        logTestsStarting(files);
        for (let file of files) {
            if (file[0] !== '|') continue;
            let tests = JSON.parse(fs.readFileSync(`./${PYTHAGORA_TESTS_DIR}/${file}`));
            for (let test of tests) {
                results.push(await makeTestRequest(test) || false);
            }
        }

        let passedCount = results.filter(r => r).length,
            failedCount = results.filter(r => !r).length;
        logTestsFinished(passedCount, failedCount);
        console.log(`Time it took to run all Pythagora tests: \x1b[32m${((new Date() - startTime)/1000).toFixed(2)}s\x1b[0m`);
    } catch (err) {
        console.error("Error occured while running Pythagora tests: ", err);
    }

    global.Pythagora.exit();
})();
