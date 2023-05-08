const fs = require("fs");
const path = require("path");
const {getAllGeneratedTests} = require("../utils/common");
const {convertOldTestForGPT} = require("../utils/legacy");
const {testEligibleForExportLog} = require("../utils/cmdPrint");
const {getTokensInMessages, getPromptFromFile} = require("../helpers/openai");
const {MIN_TOKENS_FOR_GPT_RESPONSE, MAX_GPT_MODEL_TOKENS} = require("../const/common");
const args = require("../utils/argumentsCheck");


function testsEligibleForExport() {
    let csvData = 'endpoint,testId,tokens\n';
    let tests = getAllGeneratedTests();
    for (let test of tests) {
        test = convertOldTestForGPT(test);
        let tokens = getTokensInMessages([
            {"role": "system", "content": "You are a QA engineer and your main goal is to find ways to break the application you're testing. You are proficient in writing automated integration tests for Node.js API servers.\n" +
                    "When you respond, you don't say anything except the code - no formatting, no explanation - only code.\n" },
            {
                "role": "user",
                "content": getPromptFromFile('generateJestTest.txt', { testData: test }),
            },
        ]);

        let isEligibleForExport = (tokens + MIN_TOKENS_FOR_GPT_RESPONSE < MAX_GPT_MODEL_TOKENS);
        testEligibleForExportLog(test.endpoint, test.testId, isEligibleForExport);
        csvData += `${test.endpoint},${test.testId},${tokens},${isEligibleForExport ? 'TRUE' : 'FALSE'}\n`;
    }
    if (args.save_csv) {
        fs.writeFileSync(path.join('./pythagora_tests_eligible_for_export.csv'), csvData);
        console.log('CSV file saved.');
    }
    process.exit(0);
}

testsEligibleForExport();
