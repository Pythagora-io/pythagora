const MODES = require('./const/modes.json');
const RedisInterceptor = require('./helpers/redis.js');
const { cleanupDb } = require('./helpers/mongodb.js');
const { makeTestRequest } = require('./helpers/testing.js');
const { logCaptureFinished, pythagoraFinishingUp } = require('./utils/cmdPrint.js');
const { getCircularReplacer } = require('./utils/common.js');
const { PYTHAGORA_TESTS_DIR, PYTHAGORA_METADATA_DIR, METADATA_FILENAME } = require('./const/common.js');

let  { BatchInterceptor } = require('@mswjs/interceptors');
let  nodeInterceptors = require('@mswjs/interceptors/lib/presets/node.js');
let  fs = require("fs");
let  _ = require("lodash");
let  { AsyncLocalStorage } = require('node:async_hooks');
// const duplexify = require('duplexify');

global.asyncLocalStorage = new AsyncLocalStorage();

class Pythagora {

    constructor(args) {
        if (!MODES[args.mode]) throw new Error('Invalid mode ', args.mode);
        else this.mode = args.mode;

        this.rerunAllFailed = args.rerun_all_failed;
        this.testId = args.test;
        this.pick = args.pick;
        this.ignore = args.ignore;

        this.version = global.PythagoraVersion;
        this.idSeq = 0;
        this.requests = {};
        this.testingRequests = {};
        this.loggingEnabled = this.mode === 'capture';
        //todo move all global vars to tempVars
        this.tempVars = {};

        this.setUpPythagoraDirs();
        // this.setUpHttpInterceptor();

        this.cleanupDone = false;

        process.on('SIGINT', this.exit.bind(this));
        process.on('exit', this.exit.bind(this));
    }

    async exit() {
        if (this.cleanupDone) return process.exit();
        this.cleanupDone = true;
        if (this.mode === MODES.test) {
            this.saveTestRunMetadata();
            await cleanupDb(this);
        } else if (this.mode === MODES.capture) {
            pythagoraFinishingUp();
            this.mode = MODES.test;
            let savedRequests = [], failedRequests = [];
            for (const request of _.values(this.requests)) {
                if (request.error) {
                    // TODO make a general function for comparing requests and use it here as well instead of only endpoint
                    failedRequests.push(request.endpoint);
                    continue;
                }
                let result = await makeTestRequest(request, true, false);
                result = result.testResult;
                if (!result) {
                    failedRequests.push(request.endpoint);
                    console.log(`Capture is not valid for endpoint ${request.endpoint} (${request.method}). Erasing...`)
                    let reqFileName = `./${PYTHAGORA_TESTS_DIR}/${request.endpoint.replace(/\//g, '|')}.json`;
                    if (!fs.existsSync(reqFileName)) continue;
                    let fileContent = JSON.parse(fs.readFileSync(reqFileName));
                    if (fileContent.length === 1) {
                        fs.unlinkSync(reqFileName);
                    } else {
                        let identicalRequestIndex = fileContent.findIndex(req => {
                            return req && req.id === request.id;
                        });

                        if (identicalRequestIndex === -1) {
                            console.error('Could not find request to delete. This should not happen. Please report this issue to Pythagora team.');
                        } else {
                            fileContent.splice(identicalRequestIndex, 1);
                            let storeData = typeof fileContent === 'string' ? fileContent : JSON.stringify(fileContent, getCircularReplacer());
                            fs.writeFileSync(reqFileName, storeData);
                        }
                    }
                } else savedRequests.push(request.endpoint);
            }

            logCaptureFinished(savedRequests.length, failedRequests.length);
        }

        fs.writeFileSync(`./${PYTHAGORA_METADATA_DIR}/finishingup`, 'done');
        process.exit();
    }

    getTestsToExecute() {
        if (this.testId) return [this.testId];
        let metadata = this.getMetadata();
        if (!metadata || !metadata.runs) return undefined;
        let runs = metadata.runs;

        if (this.rerunAllFailed) return runs[runs.length - 1].failed;

        return undefined;
    }

    getMetadata() {
        let metadata = fs.readFileSync(`./${PYTHAGORA_METADATA_DIR}/${METADATA_FILENAME}`);
        metadata = JSON.parse(metadata);
        return metadata;
    }

    saveTestRunMetadata() {
        let passed = _.values(this.testingRequests).filter(t => t.passed).map(t => t.id);
        let failed = _.values(this.testingRequests).filter(t => !t.passed).map(t => t.id);
        if (!passed.length && !failed.length) return;

        let metadata = this.getMetadata();
        metadata.runs = (metadata.runs || []).concat([{
            date: new Date(),
            version: this.version,
            passed,
            failed
        }]);
        metadata.runs = metadata.runs.slice(-10);
        fs.writeFileSync(`./${PYTHAGORA_METADATA_DIR}/${METADATA_FILENAME}`, JSON.stringify(metadata, getCircularReplacer(), 2));
        console.log('Test run metadata saved.');
    }

    setUpPythagoraDirs() {
        if (!fs.existsSync(`./${PYTHAGORA_TESTS_DIR}/`)) fs.mkdirSync(`./${PYTHAGORA_TESTS_DIR}/`);
        if (!fs.existsSync(`./${PYTHAGORA_METADATA_DIR}/`)) fs.mkdirSync(`./${PYTHAGORA_METADATA_DIR}/`);
        if (!fs.existsSync(`./${PYTHAGORA_METADATA_DIR}/${METADATA_FILENAME}`)) fs.writeFileSync(`./${PYTHAGORA_METADATA_DIR}/${METADATA_FILENAME}`, '{}');
    }

    setMongoClient(client) {
        this.mongoClient = client;
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

    httpRequestInterceptor(request, requestId, pythagora) {
        if (pythagora.mode === MODES.test) {
            let mockResponse = pythagora.getHttpMockResponse(request);
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

    async httpResponseInterceptor(response, request, pythagora) {
        if (pythagora.mode !== MODES.capture) return;
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
        if (!pythagora.requests[pythagora.getRequestKeyByAsyncStore()]) return console.error('No TRACE found for response!');
        pythagora.requests[pythagora.getRequestKeyByAsyncStore()].intermediateData.push({
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

    getRequestKeyByAsyncStore(asyncStoreId) {
        if (asyncStoreId === undefined) asyncStoreId = global.asyncLocalStorage.getStore();
        return Object.keys(this.requests).find(key => {
            return this.requests[key].asyncStore === asyncStoreId;
        });
    }

    getRequestByAsyncStore(asyncStoreId) {
        if (asyncStoreId === undefined) asyncStoreId = global.asyncLocalStorage.getStore();
        return this.requests[this.getRequestKeyByAsyncStore(asyncStoreId)];
    }

    getTestingRequestByAsyncStore(asyncStoreId) {
        if (asyncStoreId === undefined) asyncStoreId = global.asyncLocalStorage.getStore();
        return this.testingRequests[asyncStoreId];
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
        let path = `./${PYTHAGORA_TESTS_DIR}/${req.path.replace(/\//g, '|')}.json`;
        if (!fs.existsSync(path)) return;
        let capturedRequests = JSON.parse(await fs.promises.readFile(path, 'utf8'));
        return capturedRequests.find(request => request.id === req.headers['pythagora-req-id']);
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

module.exports = Pythagora;
