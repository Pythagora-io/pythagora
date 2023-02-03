let { cutWithDots, getOccurrenceInArray } = require('./common');
let pytagoraErrors = require('./errors.json');

let red = '\x1b[31m',
    green = '\x1b[32m',
    blue = '\x1b[34m',
    reset = '\x1b[0m',
    bold = '\x1b[1m';

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
❌ ${red+bold}${method} ${endpoint} ${reset}NOT captured because of: ${red+bold}${error}${reset}
`);
}

let logTestFailed = (test, response, pytagora) => {
    let errLog = '';
    for (const err in pytagoraErrors) {
        errLog += `\t${pytagoraErrors[err] + ' : ' + getOccurrenceInArray(pytagora.request.errors, pytagoraErrors[err]) + '\n'}`
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
${reset}${errLog}
    ${red+bold}]
    ${red+bold}-----------------------------------------------${reset}`);
}

let logTestPassed = (test, response, pytagora) => {
    console.log(`✅ Test ${test.method} ${test.endpoint} ${green+bold}PASSED!${reset}`);
}

let logTestsFinished = (passed, failed, linesExecuted = undefined, codeCoverage = undefined) => {
    console.log(`
${blue+bold}************************************************************${reset}
${green+bold}Pytagora finished testing!${reset}
${green+bold}${passed} ${reset}tests ${green+bold}PASSED!${reset}
${red+bold}${failed} ${reset}tests ${red+bold}FAILED!${reset}
${blue+bold}************************************************************${reset}
    `);
}

let logCaptureFinished = (passed, failed, linesExecuted = undefined, codeCoverage = undefined) => {
    console.log(`
${blue+bold}************************************************************${reset}
${green+bold}Pytagora finished capturing!${reset}
${green+bold}${passed} ${reset}requests are ${green+bold}captured!${reset}
Unable to capture ${red+bold}${failed} ${reset}request${failed === 1 ? '' : 's'}.${failed > 0 ? ' This is likely due to features Pytagora doesn\'t support yet like handling random variables (passwords, hashes, etc.) or some authentification methods.' : ''}
${blue+bold}************************************************************${reset}
    `);
}

let logTestsStarting = (files) => {
    console.log(`Starting tests on endpoints:${blue+bold}
${files.map(file => file.replace(/\|/g, '/').replace('.json', '')).join('\n')}
${reset}`);
}


module.exports = {
    logEndpointCaptured,
    logTestFailed,
    logTestPassed,
    logTestsFinished,
    logTestsStarting,
    logEndpointNotCaptured,
    logCaptureFinished
}
