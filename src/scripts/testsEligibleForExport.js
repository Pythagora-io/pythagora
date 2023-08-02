const fs = require("fs");
const path = require("path");
const {getAllGeneratedTests} = require("../utils/common");
const {convertOldTestForGPT} = require("../utils/legacy");
const {testEligibleForExportLog} = require("../utils/cmdPrint");
const {isEligibleForExport} = require("../helpers/api");
const args = require("../utils/getArgs");
const { UnitTestsCommon } = require('@pythagora.io/js-code-processing');

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

async function unitTestsEligibleForExport() {
    const { path: pathToProcess, pythagora_root: pythagoraRoot, func: funcName, force } = args;
    const unitTestsCommon = new UnitTestsCommon({ pathToProcess, pythagoraRoot, funcName, force });
    unitTestsCommon.traverseAllDirectories

    let tests = unitTestsCommon.traverseAllDirectories();
    let csvData = 'fileName,functionName,relatedFunctions\n';
    for (let path in tests) {
        let funcName = path.substring(path.lastIndexOf(':') + 1);
        let fileName = path.substring(path.lastIndexOf('/') + 1);
        let relatedFunctions = tests[path].relatedFunctions.map(rf => rf.funcName).join('\n');
        csvData += `${fileName},${funcName},${relatedFunctions}\n`;
    }
    if (args.save_csv) {
        fs.writeFileSync(path.join('./pythagora_unit_tests_eligible_for_export.csv'), csvData);
        console.log('CSV file saved.');
    }
    process.exit(0);
}

(async ()=> {
    if (args.unit_tests) await unitTestsEligibleForExport();
    else await testsEligibleForExport();
})()
