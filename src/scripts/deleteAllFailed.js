const fs = require('fs');
const { PYTHAGORA_METADATA_DIR, PYTHAGORA_TESTS_DIR, METADATA_FILENAME, PYTHAGORA_DELIMITER } = require('../const/common.js');
const { getCircularReplacer } = require('../utils/common.js');
const { logAndExit } = require('../utils/cmdPrint.js');

let metadata = fs.readFileSync(`./${PYTHAGORA_METADATA_DIR}/${METADATA_FILENAME}`);
metadata = JSON.parse(metadata);
if (!metadata || !metadata.runs || !metadata.runs.length ||
    !metadata.runs[metadata.runs.length - 1].failed.length) return logAndExit('Previous test run had no failed tests. Nothing to delete, exiting...', 'log');

let deleteTests = metadata.runs[metadata.runs.length - 1].failed;
let files = fs.readdirSync(`./${PYTHAGORA_TESTS_DIR}/`);

files = files.filter(f => f[0] !== '.');
for (let file of files) {
    if (file.indexOf(PYTHAGORA_DELIMITER) !== 0) continue;
    let tests = JSON.parse(fs.readFileSync(`./${PYTHAGORA_TESTS_DIR}/${file}`));
    let newTests = tests.filter((t) => !deleteTests.includes(t.id));

    if (tests.length !== newTests.length) fs.writeFileSync(`./${PYTHAGORA_TESTS_DIR}/${file}`, JSON.stringify(newTests, getCircularReplacer(), 2));
}

logAndExit('Successfully deleted all failed tests!', 'log');
