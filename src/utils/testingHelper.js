const axios = require('axios');
const _ = require('lodash');
const { compareResponse } = require('./common');
const { logTestPassed, logTestFailed } = require('./cmdPrint');

async function makeTestRequest(test) {
    try {
        let options = {
            method: test.method,
            url: test.url,
            headers: _.extend({'cache-control': 'no-cache', 'pytagora-req-id': test.id}, _.omit(test.headers, ['content-length', 'cache-control'])),
            maxRedirects: 0,
            cache: false,
            validateStatus: function (status) {
                return status >= 100 && status < 600;
            },
            transformResponse: (r) => r
        };
        if (test.method !== 'GET') {
            options.data = test.body;
        }
        const response = await axios(options).catch(e => {
            return e.response;
        });
        // TODO fix this along with managing the case where a request is overwritter during the capture so doesn't exist during capture filtering
        if (!global.Pytagora.request) return false;

        if(response.status >= 300 && response.status < 400) {
            response.data = {type: 'redirect', url: `${response.headers.location}`};
        }
        // TODO we should compare JSON files and ignore _id during creation because it changes every time
        let testResult = compareResponse(response.data, test.responseData);

        testResult = testResult ? test.statusCode === response.status : testResult;
        testResult = global.Pytagora.request.id === test.id && global.Pytagora.request.errors.length ? false : testResult;
        // TODO add query
        (testResult ? logTestPassed : logTestFailed)(test, response, global.Pytagora);
        return testResult;
    } catch (error) {
        console.error(error);
    }
}

module.exports = {
    makeTestRequest
}
