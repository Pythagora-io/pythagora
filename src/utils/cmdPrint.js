let { cutWithDots } = require('./common');

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

let logTestFailed = (endpoint, method, body = {}, query = {}, response, expectedResponse) => {
    console.log(`❌ Test ${red+bold}FAILED!${reset}
   ${red+bold}${method} ${endpoint} ${reset}
   ${red+bold}Body:   ${reset}${cutWithDots(JSON.stringify(body))}
   ${red+bold}Query:   ${reset}${cutWithDots(JSON.stringify(query))}
   ${red+bold}Response:   ${reset}${cutWithDots(JSON.stringify(response))}
   ${red+bold}Expected Response:   ${reset}${cutWithDots(JSON.stringify(expectedResponse))}
${red+bold}-----------------------------------------------${reset}`);
}

let logTestPassed = (endpoint, method) => {
    console.log(`✅ Test ${method} ${endpoint} ${green+bold}PASSED!${reset}`);
}

let logTestsFinished = (passed, failed, linesExecuted, codeCoverage) => {
    console.log(`
${blue+bold}************************************************************${reset}
${green+bold}Pytagora finished testing!${reset}
${green+bold}${passed} ${reset}tests ${green+bold}PASSED!${reset}
${red+bold}${failed} ${reset}tests ${red+bold}FAILED!${reset}
Total lines executed: ${blue+bold}${linesExecuted}${reset}
Code coverage: ${blue+bold}${codeCoverage}%${reset}
${blue+bold}************************************************************${reset}
    `);
}

let logTestsStarting = (files) => {
    console.log(`Starting tests on endpoints:${blue+bold}
${files.map(file => file.replaceAll('|', '/').replace('.json', '')).join('\n')}
${reset}`);
}


module.exports = {
    logEndpointCaptured,
    logTestFailed,
    logTestPassed,
    logTestsFinished,
    logTestsStarting
}
