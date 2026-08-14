const fs = require('fs');
const path = require('path');
const {PYTHAGORA_UNIT_DIR} = require("@pythagora.io/js-code-processing").common;
const {getApiConfig} = require("../helpers/api");
const { UnitTestsExpand, API } = require("@pythagora.io/js-code-processing");
const {initScreenForUnitTests} = require("./cmdGUI");
const {green, red, blue, bold, reset} = require('../utils/cmdPrint').colors;

async function expandTestsForDirectory(args) {
    const { apiUrl, apiKey, apiKeyType } = getApiConfig();
    const Api = new API(apiUrl, apiKey, apiKeyType);

    console.log('Processing folder structure...');
    ({ screen, spinner, scrollableContent } = initScreenForUnitTests());
    
    const unitTestsExpand = new UnitTestsExpand(
        {
            pathToProcess: args.path,
            pythagoraRoot: args.pythagora_root,
            force: args.force
        },
        Api,
        {
            isSaveTests: true,
            screen,
            spinner,
            scrollableContent
        }
    );
    const {errors, skippedFiles, testsGenerated} = await unitTestsExpand.runProcessing();

    screen.destroy();
    process.stdout.write('\x1B[2J\x1B[0f');
    if (errors.length) {
        let errLogPath = `${path.resolve(PYTHAGORA_UNIT_DIR, 'errorLogs.log')}`;
        fs.writeFileSync(errLogPath, JSON.stringify(errors, null, 2));
        console.error('There were errors encountered while trying to expand unit tests.\n');
        console.error(`You can find logs here: ${errLogPath}`);
    }
    if (skippedFiles.length) console.log(`${bold}Generation of ${skippedFiles.length} test suites were skipped because tests already exist. If you want to override them add "--force" flag to command${reset}`);
    if (testsGenerated.length === 0) {
        console.log(`${bold+red}No tests generated!${reset}`);
    } else {
        console.log(`Tests are saved in the following directories:${testsGenerated.reduce((acc, item) => acc + '\n' + blue + item.testPath, '')}`);
        console.log(`${bold+green}${testsGenerated.length} unit tests generated!${reset}`);
    }
    
    process.exit(0);
}

module.exports = {
    expandTestsForDirectory,
};
