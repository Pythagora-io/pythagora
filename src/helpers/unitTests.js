const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const { UnitTests, API } = require('@pythagora.io/js-code-processing');
const { PYTHAGORA_UNIT_DIR } = require('@pythagora.io/js-code-processing').common;


const { green, red, blue, bold, reset } = require('../utils/cmdPrint').colors;
const { initScreenForUnitTests } = require("./cmdGUI");

async function generateTestsForDirectory(args) {
    const API_SERVER = args.pythagora_api_server || PYTHAGORA_API_SERVER;
    const apiKey = args.openai_api_key || args.pythagora_api_key;
    const apiKeyType = args.openai_api_key ? 'openai' : 'pythagora'

    const Api = new API(API_SERVER, apiKey, apiKeyType);

    const { path: pathToProcess, pythagora_root: pythagoraRoot, func: funcName, force } = args;

    const mainArgs = {
        pathToProcess,
        pythagoraRoot,
        funcName,
        force
      };

    console.log('Processing folder structure...');
    ({ screen, spinner, scrollableContent } = initScreenForUnitTests());

    const unitTests = new UnitTests(mainArgs, Api, { isSaveTests: true, screen, spinner, scrollableContent });
    const { errors, skippedFiles, testsGenerated } = await unitTests.runProcessing();


    screen.destroy();
    process.stdout.write('\x1B[2J\x1B[0f');
    if (errors.length) {
        let errLogPath = `${path.resolve(PYTHAGORA_UNIT_DIR, 'errorLogs.log')}`;
        fs.writeFileSync(errLogPath, JSON.stringify(errors, null, 2));
        console.error('There were errors encountered while trying to generate unit tests.\n');
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
    generateTestsForDirectory,
}
