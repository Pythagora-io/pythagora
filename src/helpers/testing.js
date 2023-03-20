const axios = require('axios');
const _ = require('lodash');
const { compareResponse } = require('../utils/common');
const { logTestPassed, logTestFailed, logAppError } = require('../utils/cmdPrint');

async function makeTestRequest(test, showPassedLog = true, showFailedLog = true) {
    try {
        let options = {
            method: test.method,
            url: test.url,
            headers: _.extend({'cache-control': 'no-cache', 'pythagora-req-id': test.id}, _.omit(test.headers, ['content-length', 'cache-control'])),
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
            logAppError('⚠️ Pythagora encountered error while making a request', e.stack);
            return e.response;
        });
        // TODO fix this along with managing the case where a request is overwritter during the capture so doesn't exist during capture filtering
        if (!global.Pythagora.request) {
            // TODO add log why the request failed
            console.log('⚠️ Server returned 500 status code while making a request');
            return false;
        }

        // TODO show if we got 500 for a response
        if(response.status >= 300 && response.status < 400) {
            response.data = {type: 'redirect', url: `${response.headers.location}`};
        }
        // TODO we should compare JSON files and ignore _id during creation because it changes every time
        let reviewJson = {};
        let correctId = global.Pythagora.request.id === test.id;

        let dataResult = compareResponse(response.data, test.responseData);
        if (correctId && !dataResult) reviewJson.responseData = { capture: test.responseData, test: response.data };
        let statusCodeResult = test.statusCode === response.status;
        if (correctId && !statusCodeResult) reviewJson.statusCode = { capture: test.statusCode, test: response.status };
        let errors = global.Pythagora.request.errors;
        //todo capture all intermediate data when testing also
        if (correctId && errors.length) reviewJson.errors = errors;

        let testResult = dataResult && statusCodeResult && correctId && errors.length === 0;
        // horrible - please refactor at one point
        _.values(global.Pythagora.testingRequests).find(v => v.id === test.id).passed = testResult;

        // TODO add query
        if (showPassedLog && testResult) logTestPassed(test);
        if (showFailedLog && !testResult) logTestFailed(test, response, global.Pythagora);
        return { testResult, reviewJson };
    } catch (error) {
        console.error(error);
    }
}

module.exports = {
    makeTestRequest
}
