const MODES = require('./const/modes.json');
const RedisInterceptor = require('./helpers/redis.js');
const { configureMongoosePlugin, cleanupDb } = require('./helpers/mongo.js');
const { makeTestRequest } = require('./helpers/testing.js');
const { setUpExpressMiddleware } = require('./helpers/middlewares.js');
const { logCaptureFinished, pytagoraFinishingUp } = require('./utils/cmdPrint.js');
const { getCircularReplacer } = require('./utils/common.js');

let  { BatchInterceptor } = require('@mswjs/interceptors');
let  nodeInterceptors = require('@mswjs/interceptors/lib/presets/node.js');
let  fs = require("fs");
let  _ = require("lodash");
let mongoose = require("../../mongoose");
let  { AsyncLocalStorage } = require('node:async_hooks');
// const duplexify = require('duplexify');
// const MockDate = require('mockdate'); todo find solution for expiration of tokens (we need to run capture and tests on same date/time)

global.asyncLocalStorage = new AsyncLocalStorage();

let app;

class Pytagora {

    constructor(mode) {
        if (!MODES[mode]) throw new Error('Invalid mode');
        else this.mode = mode;

        this.idSeq = 0;
        this.requests = {};
        this.testingRequests = {};
        this.loggingEnabled = mode === 'capture';

        if (!fs.existsSync('./pytagora_data/')) fs.mkdirSync('./pytagora_data/');

        // this.setUpHttpInterceptor();

        configureMongoosePlugin(this);

        this.cleanupDone = true;

        process.on('SIGINT', this.exit.bind(this));
        process.on('exit', this.exit.bind(this));
    }

    async exit() {
        if (this.cleanupDone) return;
        this.cleanupDone = true;
        if (this.mode === MODES.test) await cleanupDb();
        if (this.mode === MODES.capture) {
            pytagoraFinishingUp();
            this.mode = MODES.test;
            let savedRequests = [], failedRequests = [];
            for (const request of _.values(this.requests)) {
                if (request.error) {
                    // TODO make a general function for comparing requests and use it here as well instead of only endpoint
                    failedRequests.push(request.endpoint);
                    continue;
                }
                let result = await makeTestRequest(request, true, false);
                if (!result) {
                    failedRequests.push(request.endpoint);
                    console.log(`Capture is not valid for endpoint ${request.endpoint} (${request.method}). Erasing...`)
                    let reqFileName = `./pytagora_data/${request.endpoint.replace(/\//g, '|')}.json`;
                    if (!fs.existsSync(reqFileName)) continue;
                    let fileContent = JSON.parse(fs.readFileSync(reqFileName));
                    if (fileContent.length === 1) {
                        fs.unlinkSync(reqFileName);
                    } else {
                        let identicalRequestIndex = fileContent.findIndex(req => {
                            return req && req.id === request.id;
                        });

                        if (identicalRequestIndex === -1) {
                            console.error('Could not find request to delete. This should not happen. Please report this issue to Pytagora team.');
                        } else {
                            fileContent.splice(identicalRequestIndex, 1);
                            let storeData = typeof fileContent === 'string' ? fileContent : JSON.stringify(fileContent, getCircularReplacer());
                            fs.writeFileSync(reqFileName, storeData);
                        }
                    }
                } else savedRequests.push(request.endpoint);
            }

            savedRequests = _.uniq(savedRequests);
            failedRequests = _.uniq(failedRequests);
            logCaptureFinished(savedRequests.length, failedRequests.length);
        }
        process.exit();
    }

    setApp(newApp) {
        app = newApp;
        setUpExpressMiddleware(app, this, mongoose);
    }

    getApp() {
        return app;
    }

    setUpHttpInterceptor() {
        const interceptor = new BatchInterceptor({
            name: 'my-interceptor',
            interceptors: nodeInterceptors.default,
        });

        interceptor.apply();

        interceptor.on('request', (req, reqId) => this.httpRequestInterceptor(req, reqId, this));
        interceptor.on('response', (res, req) => this.httpResponseInterceptor(res, req, this));
    }

    httpRequestInterceptor(request, requestId, pytagora) {
        if (pytagora.mode === MODES.test) {
            let mockResponse = pytagora.getHttpMockResponse(request);
            if (!mockResponse) return console.error('No mock response found for request!');

            request.respondWith(
                new Response(
                    JSON.stringify(mockResponse.responseData),
                    {
                        status: mockResponse.response.status,
                        statusText: mockResponse.response.statusText,
                        // TODO headers: mockResponse.response.headers
                    }
                )
            )
        }
    }

    async httpResponseInterceptor(response, request, pytagora) {
        if (pytagora.mode !== MODES.capture) return;
        async function readStream(reader) {
            let result;
            let values = [];
            while (!result || !result.done) {
                result = await reader.read();
                values.push(result.value);
            }

            let finalResult = values.join('').toString('utf8');
            try { finalResult = JSON.parse(finalResult); } catch (e) {}
            return finalResult;
        }

        let reader = response.body.getReader();
        let responseBody = await readStream(reader);
        if (!pytagora.requests[pytagora.getRequestKeyByAsyncStore()]) return console.error('No TRACE found for response!');
        pytagora.requests[pytagora.getRequestKeyByAsyncStore()].intermediateData.push({
            type: 'outgoing_request',
            url: request.url,
            method: request.method,
            responseData: responseBody,
            response: {
                status: response.status,
                statusText: response.statusText,
                // TODO headers: response.headers
            }
        });
    }

    // TODO track request order and make sure the correct ones get chosen
    getHttpMockResponse(request) {
        return this.testingRequests[global.asyncLocalStorage.getStore()].intermediateData.find(intData => {
            // TODO add more checks (body, query, params)
            return intData.type === 'outgoing_request' &&
                intData.url === request.url &&
                intData.method === request.method;
        });
    }

    getRequestKeyByAsyncStore() {
        return Object.keys(this.requests).find(key => {
            return this.requests[key].asyncStore === global.asyncLocalStorage.getStore();
        });
    }

    updateTrace(asyncId, triggerAsyncId) {
        for (let i = 0; i < Object.keys(this.requests).length; i++) {
            if (this.requests[Object.keys(this.requests)[i]].trace.includes(triggerAsyncId)) {
                this.requests[Object.keys(this.requests)[i]].trace.push(asyncId);
                break;
            }
        }
    }

    async getRequestMockDataById(req) {
        let path = `./pytagora_data/${req.path.replace(/\//g, '|')}.json`;
        if (!fs.existsSync(path)) return;
        let capturedRequests = JSON.parse(await fs.promises.readFile(path, 'utf8'));
        return capturedRequests.find(request => request.id === req.headers['pytagora-req-id']);
    }

    async runRedisInterceptor(intermediateData) {
        this.RedisInterceptor = new RedisInterceptor(
            this,
            16379,
            6379,
            intermediateData
        );

        await this.RedisInterceptor.init();
    }

    saveRedisData(request, response) {
        _.keys(this.requests).forEach(k => this.requests[k].intermediateData.push({
            type: 'redis',
            request, response
        }));
    }

}

module.exports = Pytagora;
