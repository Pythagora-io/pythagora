const axios = require('axios');
const fs = require('fs');
const qs = require('querystring');
const _ = require('lodash');
const { logTestPassed, logTestFailed, logTestsFinished, logTestsStarting } = require('./src/utils/cmdPrint');

async function makeRequest(test) {
    try {
        let options = {
            method: test.method,
            url: addIdToUrl(test.url, test.id),
            headers: _.extend({'cache-control': 'no-cache'}, _.omit(test.headers, ['content-length', 'cache-control'])),
            maxRedirects: 0,
            cache: false,
            validateStatus: function (status) {
                return status >= 100 && status < 600;
            },
            transformResponse: (r) => r
        };
        if (test.method !== 'GET') {
            // TODO create more comprehensive check for body when parsing pytagoraBody
            try {
                options.data = JSON.parse(test.pytagoraBody);
            } catch (e) {
                options.data = qs.parse(test.pytagoraBody) || {};
            }
        }
        const response = await axios(options);

        if(response.status >= 300 && response.status < 400) {
            response.data = {type: 'redirect', url: `${response.headers.location}`};
        }
        // TODO trebamo uspoređivati JSON fileove i ignorirati _id prilikom createa jer se on mijenja svaki put
        let testResult = compareResponse(response.data, test.responseData);

        testResult = global.Pytagora.request.id === test.id && global.Pytagora.request.errors.length ? false : testResult;
        // TODO add query
        (testResult ? logTestPassed : logTestFailed)(test.endpoint, test.method, test.pytagoraBody, undefined, test.responseData, response.data, global.Pytagora.request.errors);
        return testResult;
    } catch (error) {
        console.error(error);
    }
}

function addIdToUrl(url, id) {
    return `${url}${url.includes('?') ? '&' : '?'}reqId=${id}`;
}

function compareResponse(a, b) {
    return typeof a !== typeof b ? false :
        typeof a === 'string' && a.toLowerCase().includes('<!doctype html>') && b.toLowerCase().includes('<!doctype html>') ? true : //todo make appropriate check
            typeof a === 'object' ? compareJson(a,b) : a === b;
}

function compareJson(a, b) {
    let aProps = Object.getOwnPropertyNames(a);
    let bProps = Object.getOwnPropertyNames(b);
    if (aProps.length !== bProps.length) {
        return false;
    }
    for (let i = 0; i < aProps.length; i++) {
        let propName = aProps[i];
        if (a[propName] !== b[propName]) {
            if (typeof a[propName] === 'object') {
                if (!compareJson(a[propName], b[propName]))
                    return false;
            } else
                return false;
        }
    }
    return true;
}

(async () => {
    const directory = './pytagora_data';
    const results = [];

    try {
        let files = fs.readdirSync(directory);
        files = files.filter(f => f[0] !== '.');
        logTestsStarting(files);
        for (let file of files) {
            let tests = JSON.parse(fs.readFileSync(`./pytagora_data/${file}`));
            for (let test of tests) {
                results.push(await makeRequest(test) || false);
            }
        }

        let passedCount = results.filter(r => r).length,
            failedCount = results.filter(r => !r).length,
            linesExecuted = global.Pytagora.instrumenter.getCurrentlyExecutedLines(),
            codeCoverage = global.Pytagora.instrumenter.getCurrentlyExecutedLines(false, true);
        logTestsFinished(passedCount, failedCount, linesExecuted, codeCoverage);
    } catch (err) {
        console.error("Error occured while running Pytagora tests: ", err);
    }
})();
