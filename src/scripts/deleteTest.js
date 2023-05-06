const fs = require('fs');
const { PYTHAGORA_TESTS_DIR, PYTHAGORA_DELIMITER } = require('../const/common.js');
const { getCircularReplacer } = require('../utils/common.js');
const { logAndExit } = require('../utils/cmdPrint.js');
const args = require('../utils/getArgs.js');

try {
    let id = args.delete;
    let deleted = false;

    if (typeof id !== 'string') logAndExit(`When using --delete flag with Pythagora you have to give test ID (of test you want to delete). Eg. --delete 390ca171-1d12-449c-b847-e215b07755e8`);
    let files = fs.readdirSync(`./${PYTHAGORA_TESTS_DIR}/`);

    files = files.filter(f => f[0] !== '.');
    for (let file of files) {
        if (file.indexOf(PYTHAGORA_DELIMITER) !== 0) continue;
        let tests = JSON.parse(fs.readFileSync(`./${PYTHAGORA_TESTS_DIR}/${file}`));
        let newTests = tests.filter((t) => t.id !== id);

        if (tests.length !== newTests.length) {
            deleted = true;
            fs.writeFileSync(`./${PYTHAGORA_TESTS_DIR}/${file}`, JSON.stringify(newTests, getCircularReplacer(), 2));
        }
    }

    deleted ? logAndExit(`Successfully deleted test with id: ${id}!`, 'log')
        : logAndExit(`Couldn't find test with id: ${id}!`, 'error');
} catch (e) {
    logAndExit(e);
}
