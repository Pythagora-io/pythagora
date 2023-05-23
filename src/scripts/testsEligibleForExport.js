const fs = require("fs");
const path = require("path");
const {getAllGeneratedTests} = require("../utils/common");
const {convertOldTestForGPT} = require("../utils/legacy");
const {testEligibleForExportLog} = require("../utils/cmdPrint");
const {isEligibleForExport} = require("../helpers/api");
const args = require("../utils/argumentsCheck");


async function testsEligibleForExport() {
    let csvData = 'endpoint,testId,tokens\n';
    let tests = getAllGeneratedTests();
    for (let test of tests) {
        test = convertOldTestForGPT(test);
        let isEligible = await isEligibleForExport(test);
        testEligibleForExportLog(test.endpoint, test.testId, isEligible);
        csvData += `${test.endpoint},${test.testId},${isEligible ? 'TRUE' : 'FALSE'}\n`;
    }
    if (args.save_csv) {
        fs.writeFileSync(path.join('./pythagora_tests_eligible_for_export.csv'), csvData);
        console.log('CSV file saved.');
    }
    process.exit(0);
}

(async ()=> {
    await testsEligibleForExport();
})()
