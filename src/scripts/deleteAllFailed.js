const fs = require('fs');
const path = require('path');
const { REVIEW_DATA_FILENAME, PYTHAGORA_METADATA_DIR, PYTHAGORA_TESTS_DIR, METADATA_FILENAME, PYTHAGORA_DELIMITER } = require('../const/common.js');
const { getCircularReplacer } = require('../utils/common.js');
const { logAndExit } = require('../utils/cmdPrint.js');
let args = require('../utils/getArgs.js');

let metadata = fs.readFileSync(path.resolve(args.pythagora_root, PYTHAGORA_METADATA_DIR, METADATA_FILENAME));
metadata = JSON.parse(metadata);
if (!metadata || !metadata.runs || !metadata.runs.length ||
    !metadata.runs[metadata.runs.length - 1].failed.length) logAndExit('Previous test run had no failed tests. Nothing to delete, exiting...', 'log');

let deleteTests = metadata.runs[metadata.runs.length - 1].failed;
let files = fs.readdirSync(path.resolve(args.pythagora_root, PYTHAGORA_TESTS_DIR));

try {
    files = files.filter(f => f[0] !== '.');
    for (let file of files) {
        if (file.indexOf(PYTHAGORA_DELIMITER) !== 0) continue;
        let tests = JSON.parse(fs.readFileSync(path.resolve(args.pythagora_root, PYTHAGORA_TESTS_DIR, file)));
        let newTests = tests.filter((t) => !deleteTests.includes(t.id));

        if (tests.length !== newTests.length) fs.writeFileSync(path.resolve(args.pythagora_root, PYTHAGORA_TESTS_DIR, file), JSON.stringify(newTests, getCircularReplacer(), 2));
    }

    //cleanup review.json if all failed tests are deleted
    fs.writeFileSync(path.resolve(args.pythagora_root, PYTHAGORA_METADATA_DIR, REVIEW_DATA_FILENAME), '[]');

    logAndExit('Successfully deleted all failed tests!', 'log');
} catch (e) {
    logAndExit(`Error deleting all failed tests: ${e.message}`, 'error');
}
