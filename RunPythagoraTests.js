const { logTestsFinished, logTestsStarting } = require('./src/utils/cmdPrint');
const { makeTestRequest } = require('./src/helpers/testing.js');

const fs = require('fs');

(async () => {
    const directory = './pythagora_data';
    const results = [];

    try {
        let files = fs.readdirSync(directory);
        files = files.filter(f => f[0] !== '.');
        logTestsStarting(files);
        for (let file of files) {
            if (file[0] !== '|') continue;
            let tests = JSON.parse(fs.readFileSync(`${directory}/${file}`));
            for (let test of tests) {
                results.push(await makeTestRequest(test) || false);
            }
        }

        let passedCount = results.filter(r => r).length,
            failedCount = results.filter(r => !r).length;
            logTestsFinished(passedCount, failedCount);
    } catch (err) {
        console.error("Error occured while running Pythagora tests: ", err);
    }

    process.exit(0);
})();
