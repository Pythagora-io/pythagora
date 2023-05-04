let { cutWithDots, compareJson, compareJsonDetailed } = require('./common');
let pythagoraErrors = require('../const/errors');
let args = require('../utils/argumentsCheck.js');
let { PYTHAGORA_DELIMITER } = require('../const/common');

let red = '\x1b[31m',
    yellow = '\x1b[33m',
    green = '\x1b[32m',
    blue = '\x1b[34m',
    reset = '\x1b[0m',
    bold = '\x1b[1m';

let logWithStoreId = (msg) => {
    const id = global.asyncLocalStorage.getStore();
    // console.log(`${id !== undefined ? id : '-'}:`, msg);
}

let logEndpointCaptured = (endpoint, method, body, query, responseBody = {}) => {
    console.log(`
✅ ${blue+bold}${method} ${endpoint} ${reset}captured
   ${blue+bold}Body:   ${reset}${cutWithDots(JSON.stringify(body))}
   ${blue+bold}Query:   ${reset}${cutWithDots(JSON.stringify(query))}
   ${blue+bold}Response:   ${reset}${cutWithDots(JSON.stringify(responseBody))}
   ${blue+bold}-----------------------------------------------${reset}`);
}

let logEndpointNotCaptured = (endpoint, method, error) => {
    console.log(`
⚠️  ${yellow+bold}${method} ${endpoint} ${reset}NOT captured because of: ${yellow+bold}${error}${reset}
`);
}

let logAppError = (message, error) => {
    console.log(`${yellow+bold}${message}${reset}`);
    console.error(error);
}

let logTestFailed = (test, response, pythagora) => {
    let errLog = '';
    let errors = [...new Set(pythagora.request.errors.map((e) => e.type))];
    for (const err of errors) {
        errLog += `\t${pythagoraErrors[err]}\n`;
    }
    console.log(`❌ Test ${red+bold}FAILED!${reset}
    ${red+bold}${test.method} ${test.endpoint} ${reset}
    ${red+bold}ReqId:   ${reset}${cutWithDots(JSON.stringify(test.id))}
    ${red+bold}Body:   ${reset}${cutWithDots(JSON.stringify(test.body))}
    ${red+bold}Query:   ${reset}${cutWithDots(JSON.stringify(test.query || {}))}
    ${red+bold}StatusCode:   ${reset}${cutWithDots(JSON.stringify(response.status))}
    ${red+bold}Expected StatusCode:   ${reset}${cutWithDots(JSON.stringify(test.statusCode))}
    ${red+bold}Response:   ${reset}${cutWithDots(JSON.stringify(response.data))}
    ${red+bold}Expected Response:   ${reset}${cutWithDots(JSON.stringify(test.responseData))}
    ${red+bold}Errors:   [
${reset}${errLog}\t${red+bold}]
    ${red+bold}-----------------------------------------------${reset}`);
}

let logTestPassed = (test) => {
    console.log(`✅ Test ${test.method} ${test.endpoint} ${green+bold}PASSED!${reset}`);
}

let logTestsFinished = (passed, failed, linesExecuted = undefined, codeCoverage = undefined) => {
    console.log(`
${blue+bold}************************************************************${reset}
${green+bold}Pythagora finished testing!${reset}
${green+bold}${passed} ${reset}tests ${green+bold}PASSED!${reset}
${red+bold}${failed} ${reset}tests ${red+bold}FAILED!${reset}
${blue+bold}************************************************************${reset}
    `);
}

let logCaptureFinished = (passed, failed, linesExecuted = undefined, codeCoverage = undefined) => {
    console.log(`
${blue+bold}************************************************************${reset}
${green+bold}Pythagora finished capturing!${reset}
${green+bold}${passed} ${reset}requests are ${green+bold}captured!${reset}
Unable to capture ${yellow+bold}${failed} ${reset}request${failed === 1 ? '' : 's'}.${failed > 0 ? ' This is likely due to features Pythagora doesn\'t support yet like handling random variables (passwords, hashes, etc.), uploading files or some authentification methods.' : ''}
${blue+bold}************************************************************${reset}
    `);
}

let logTestsStarting = (files) => {
    console.log(`Starting tests on endpoints:${blue+bold}
${files.map(file => file.replace(new RegExp(PYTHAGORA_DELIMITER, 'g'), '/').replace('.json', '')).join('\n')}
${reset}`);
}

let pythagoraFinishingUp = () => {
    console.log(`\n\n${blue+bold}Pythagora capturing done. Finishing up...${reset}\n`);
}

function logChange(change, ignoreKeys, mongoNotExecuted, mongoQueryNotFound, mongoDiff, mongoResDiff) {
    console.log(`\n${blue+bold}************************************************************${reset}`);
    console.log(`Endpoint: ${blue}${change.filename.replace(new RegExp(PYTHAGORA_DELIMITER, 'g'), "/").replace('.json', '')}${reset}`);
    console.log(`Test id: ${blue}${change.id}${reset}`);
    for (let key of Object.keys(change).filter((k) => !ignoreKeys.includes(k))) {
        console.log(`\n${reset}Difference: ${bold}${blue}${key}${reset}`);
        let diffRes = compareJsonDetailed(change[key].capture, change[key].test, true);
        console.log(`${red}- ${JSON.stringify(diffRes.capture)}${reset}`);
        console.log(`${green}+ ${JSON.stringify(diffRes.test)}${reset}`);
    }
    if (mongoDiff && mongoDiff.length) {
        let logProp = ['query', 'options', 'otherArgs']
        mongoDiff.forEach((diff) => {
            console.log(`\n${reset}Mongo difference:`);
            console.log(`Collection: ${blue}${bold}${diff.capture.collection}${reset}, Operation: ${blue}${bold}${diff.capture.op}${reset}`);
            logProp.forEach((p) => {
                if (!compareJson(diff.capture[p], diff.test[p], true)) {
                    let diffRes = compareJsonDetailed(diff.capture[p], diff.test[p], true);
                    console.log(`\n${p}:`);
                    console.log(`${red}- ${JSON.stringify(diffRes.capture)}${reset}`);
                    console.log(`${green}+ ${JSON.stringify(diffRes.test)}${reset}`);
                }
            });
        })
    }
    if (mongoResDiff && mongoResDiff.length) {
        let logProp = ['mongoResult', 'postQueryRes']
        mongoResDiff.forEach((diff) => {
            console.log(`\n${reset}Mongo result difference:`);
            console.log(`Collection: ${blue}${bold}${diff.collection}${reset}, Operation: ${blue}${bold}${diff.op}${reset}`);
            logProp.forEach((p) => {
                if (!compareJson(diff.capture[p], diff.test[p], true)) {
                    let diffRes = compareJsonDetailed(diff.capture[p], diff.test[p], true);
                    console.log(`\n${p}:`);
                    console.log(`${red}- ${JSON.stringify(diffRes.capture)}${reset}`);
                    console.log(`${green}+ ${JSON.stringify(diffRes.test)}${reset}`);
                }
            });
        })
    }
    if (mongoNotExecuted && mongoNotExecuted.length) {
        console.log(`\n${reset}Mongo queries that executed while ${bold+blue}capturing${reset} (but didn't while testing):`);
        console.log(`${yellow}${mongoNotExecuted.map((m) => 'Operation: ' + m.op + '\nCollection: ' + m.collection + '\nQuery: ' + JSON.stringify(m.query)).join('\n\n')}`);
        console.log(`${reset}`);
    }
    if (mongoQueryNotFound && mongoQueryNotFound.length) {
        console.log(`\n${reset}Mongo queries that executed while ${bold+blue}testing${reset} (but didn't while capturing):`);
        console.log(`${yellow}${mongoQueryNotFound.map((m) => 'Operation: ' + m.op + '\nCollection: ' + m.collection + '\nQuery: ' + JSON.stringify(m.query)).join('\n\n')}`);
        console.log(`${reset}`);
    }
}

function logAndExit(message, type='error') {
    console[type](message);
    process.exit(1);
}

function testExported(testId) {
    if (!args.no_stream) console.log(`\n${green}${bold}--------------------------END OF THE TEST--------------------------${reset}`);
    console.log(`${green}${bold}Woohoo - you\'ve exported a test to Jest!${reset} You can run it with command:`);
    console.log(`${blue}${bold}npx pythagora --init-command \"${args.init_command.join(' ')}\" --mode jest --test-id ${testId} --no-code-coverage${reset}`)
}

function testExportStartedLog() {
    console.log(`${bold}Exporting test started - waiting on GPT...${reset}`);
    if (!args.no_stream) console.log(`${green}${bold}--------------------------GPT OUTPUT--------------------------${reset}`);
}

function jestAuthFileGenerationLog() {
    console.log(`${green}${bold}Creating auth file for Jest tests...${reset}`);
    if (!args.no_stream) console.log(`${green}${bold}--------------------------GPT OUTPUT--------------------------${reset}`);
}

function loginRouteEnteredLog(endpointPath) {
    console.log(`You entered: ${green}${bold}${endpointPath}${reset}`);
}

function pleaseCaptureLoginTestLog(loginEndpointPath) {
    console.log(`${red}${bold}To export test to Jest, Pythagora needs a captured test with a successful login to your app!${reset}`);
    console.log(`Login path is: ${green}${bold}${loginEndpointPath}${reset}`);
    console.log('Please run the Pythagora capture command, log into your app and try the export again.');
    console.log('To start Pythagora capture, run:');
    console.log(`${blue}${bold}npx pythagora --init-command \"${args.init_command.join(' ')}\" --mode capture${reset}`);
}

function logLoginEndpointCaptured() {
    console.log(`${green}${bold}------------------------------------------------------------${reset}`);
    console.log(`${green}${bold}------------------------------------------------------------${reset}`);
    console.log(`${green}${bold}Login endpoint captured - you can now start exporting tests!${reset}`);
    console.log(`${green}${bold}------------------------------------------------------------${reset}`);
    console.log(`${green}${bold}------------------------------------------------------------${reset}`);
}

function primeJestLog() {
    console.error(`Please finish the authentication priming to export tests to Jest. Run ${bold}${green}npx pythagora --init-command "${args.init_command.join(' ')}" --export${reset}`);
}


module.exports = {
    logEndpointCaptured,
    logTestFailed,
    logTestPassed,
    logTestsFinished,
    logTestsStarting,
    logEndpointNotCaptured,
    logCaptureFinished,
    pythagoraFinishingUp,
    logWithStoreId,
    logAppError,
    testExportStartedLog,
    logAndExit,
    testExported,
    jestAuthFileGenerationLog,
    loginRouteEnteredLog,
    pleaseCaptureLoginTestLog,
    logLoginEndpointCaptured,
    primeJestLog
}
