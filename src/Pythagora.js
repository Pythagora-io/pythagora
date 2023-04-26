const MODES = require('./const/modes.json');
const RedisInterceptor = require('./helpers/redis.js');
const { cleanupDb } = require('./helpers/mongodb.js');
const { makeTestRequest } = require('./helpers/testing.js');
const { getPythagoraVersion } = require("./helpers/starting.js");
const { logCaptureFinished, pythagoraFinishingUp } = require('./utils/cmdPrint.js');
const { getCircularReplacer, getMetadata, getFreePortInRange } = require('./utils/common.js');
const { PYTHAGORA_TESTS_DIR, PYTHAGORA_METADATA_DIR, METADATA_FILENAME, PYTHAGORA_DELIMITER } = require('./const/common.js');

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
        this.ignoreRedis = args.ignore_redis;
        this.testId = args.test_id;
        this.pick = args.pick;
        this.ignore = args.ignore;
        this.fullCodeCoverageReport = args.full_code_coverage_report;
        this.initCommand = args.init_command.join(' ');

        this.idSeq = 0;
        this.requests = {};
        this.testingRequests = {};
        this.loggingEnabled = this.mode === 'capture';
        //todo move all global vars to tempVars
        this.tempVars = {};

        getPythagoraVersion(this);

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
                    let reqFileName = `./${PYTHAGORA_TESTS_DIR}/${request.endpoint.replace(/\//g, PYTHAGORA_DELIMITER)}.json`;
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
        let metadata = getMetadata();
        if (!metadata || !metadata.runs) return undefined;
        let runs = metadata.runs;

        if (this.rerunAllFailed) return runs[runs.length - 1].failed;

        return undefined;
    }

    saveTestRunMetadata() {
        let passed = _.values(this.testingRequests).filter(t => t.passed).map(t => t.id);
        let failed = _.values(this.testingRequests).filter(t => !t.passed).map(t => t.id);
        if (!passed.length && !failed.length) return;

        let metadata = getMetadata();
        metadata.runs = (metadata.runs || []).concat([{
            date: new Date(),
            version: this.version,
            passed,
            failed
        }]);
        metadata.runs = metadata.runs.slice(-10);
        metadata.initCommand = this.initCommand;
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
        let path = `./${PYTHAGORA_TESTS_DIR}/${req.path.replace(/\//g, PYTHAGORA_DELIMITER)}.json`;
        if (!fs.existsSync(path)) return;
        let capturedRequests = JSON.parse(await fs.promises.readFile(path, 'utf8'));
        return capturedRequests.find(request => request.id === req.headers['pythagora-req-id']);
    }

    async runRedisInterceptor(intermediateData) {
        if (this.ignoreRedis) return;

        let listenPort = await getFreePortInRange(16000, 17000);
        this.RedisInterceptor = new RedisInterceptor(
            this,
            listenPort,
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

    isMongoConnected() {
        return this.mongoClient && (this.mongoClient.connected ||
            (this.mongoClient.isConnected && this.mongoClient.isConnected()) ||
            (this.mongoClient.topology && this.mongoClient.topology.isConnected && this.mongoClient.topology.isConnected()))
    }

    runWhenServerReady(callback) {
        let interval = setInterval(() => {
            // todo add here all checks that server is ready (express, redis,...)
            if (this.isMongoConnected()) {
                clearInterval(interval);
                callback();
            }
        }, 200);
    }

}

module.exports = Pythagora;
