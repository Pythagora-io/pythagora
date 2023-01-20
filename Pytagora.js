// import {v4} from 'uuid';
// import { createHook, triggerAsyncId, executionAsyncId } from 'async_hooks';
// import { BatchInterceptor } from '@mswjs/interceptors';
// import nodeInterceptors from '@mswjs/interceptors/lib/presets/node.js';
// import mongoose from "mongoose";
// import FS from "fs";
// import _ from "lodash";
// import { AsyncLocalStorage, AsyncResource } from 'node:async_hooks';
// import RedisInterceptor from './RedisInterceptor.js';

let  {v4} = require('uuid');
let  { createHook, triggerAsyncId, executionAsyncId } = require('async_hooks');
let  { BatchInterceptor } = require('@mswjs/interceptors');
let  nodeInterceptors = require('@mswjs/interceptors/lib/presets/node.js');
let  FS = require("fs");
let  _ = require("lodash");
let  { AsyncLocalStorage, AsyncResource } = require('node:async_hooks');
const RedisInterceptor = require("./RedisInterceptor.js");
const instrumenter = require('./instrumenter');
const { logEndpointCaptured, logTestFailed, logTestPassed, logTestsFinished } = require('./src/utils/cmdPrint.js');
const duplexify = require('duplexify');

const asyncLocalStorage = new AsyncLocalStorage();

function logWithStoreId(msg) {
    const id = asyncLocalStorage.getStore();
    // console.log(`${id !== undefined ? id : '-'}:`, msg);
}

let idSeq = 0;
let loggingEnabled;
let requests = {};
let testingRequests = {};
let methods = ['save','find', 'insert', 'update', 'delete', 'deleteOne', 'insertOne', 'updateOne', 'updateMany', 'deleteMany', 'replaceOne', 'replaceOne', 'remove', 'findOneAndUpdate', 'findOneAndReplace', 'findOneAndRemove', 'findOneAndDelete', 'findByIdAndUpdate', 'findByIdAndRemove', 'findByIdAndDelete', 'exists', 'estimatedDocumentCount', 'distinct', 'translateAliases', '$where', 'watch', 'validate', 'startSession', 'diffIndexes', 'syncIndexes', 'populate', 'listIndexes', 'insertMany', 'hydrate', 'findOne', 'findById', 'ensureIndexes', 'createIndexes', 'createCollection', 'create', 'countDocuments', 'count', 'bulkWrite', 'aggregate'];
let app, mongoose, ObjectId;
let MODES = {
    'capture': 'capture',
    'test': 'test'
};
let pytagoraDb = 'pytagoraDb';
let pytagoraDbConnection;

class Pytagora {

    constructor(mode) {
        if (!MODES[mode]) throw new Error('Invalid mode');
        else this.mode = mode;
        loggingEnabled = mode === 'capture';

        if (!FS.existsSync('./pytagora_data/')) FS.mkdirSync('./pytagora_data/');

        this.setUpHttpInterceptor();

        this.codeCoverage = {};

        this.instrumenter = instrumenter;
    }

    setApp(newApp) {
        app = newApp;
        this.setUpExpressMiddleware(app);
    }

    getApp() {
        return app;
    }

    setMongoose(newMongoose) {
        // we need to use users mongoose version to be able to setup plugin and pre/post hooks properly
        mongoose = newMongoose;
        ObjectId = mongoose.Types.ObjectId;
        this.configureMongoosePlugin();
    }

    getMongoose() {
        return mongoose;
    }

    setUpHttpInterceptor() {
        const interceptor = new BatchInterceptor({
            name: 'my-interceptor',
            interceptors: nodeInterceptors.default,
        });

        interceptor.apply();

        // interceptor.on('request', (req, reqId) => this.httpRequestInterceptor(req, reqId, this));
        // interceptor.on('response', (res, req) => this.httpResponseInterceptor(res, req, this));
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
        if (!requests[Pytagora.getRequestKeyByAsyncStore()]) return console.error('No TRACE found for response!');
        requests[Pytagora.getRequestKeyByAsyncStore()].intermediateData.push({
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
        return testingRequests[asyncLocalStorage.getStore()].intermediateData.find(intData => {
            // TODO add more checks (body, query, params)
            return intData.type === 'outgoing_request' &&
                intData.url === request.url &&
                intData.method === request.method;
        });
    }

    setUpExpressMiddleware(app) {
        app.use(async (req,res,next) => {
            if (this.mode !== MODES.test) return next();

            let prepareDB = async() => {
                const collections = await mongoose.connection.db.collections();
                for (const collection of collections) {
                    await collection.drop();
                }

                const testReq = await this.getRequestMockDataById(req);
                if (!testReq) return next();

                let uniqueIds = [];
                for (const data of testReq.intermediateData) {
                    if (data.type !== 'mongo') continue;
                    let insertData = [];
                    for (let doc of data.preQueryRes) {
                        if (!uniqueIds.includes(doc._id)) {
                            uniqueIds.push(doc._id);
                            insertData.push(this.convertObjectId(doc));
                        }
                    }
                    if(insertData.length) await mongoose.connection.db.collection(data.req.collection).insertMany(insertData);
                }
                return next();
            }

            let pytagoraConnection = mongoose.connections.filter((c) => c.name === pytagoraDb);
            if (pytagoraConnection.length) return await prepareDB();

            let connection = mongoose.connections[0];
            mongoose.disconnect();
            pytagoraDbConnection = await mongoose.connect(`mongodb://${connection.host}:${connection.port}/${pytagoraDb}`, {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });
            for (const connection of mongoose.connections) {
                if (connection.name !== pytagoraDb) connection.close();
            }
            await prepareDB();
        });

        app.use((req, res, next) => {
            if (this.mode !== MODES.capture) return next();
            if (!req.id) req.id = v4();
            if (!requests[req.id]) requests[req.id] = {};
            let data = '';
            const inputStream = req;
            const duplexStream = duplexify();

            duplexStream.setReadable(inputStream);
            req.duplexStream = duplexStream;
            duplexStream.on('data', (chunk) => {
                data+=chunk.toString();
            });
            duplexStream.on('end', () => {
                requests[req.id].pytagoraBody = data;
            });
            next();
        });

        app.use(async (req, res, next) => {
            this.RedisInterceptor.setMode(this.mode);
            if (this.mode === MODES.capture) await this.apiCaptureInterceptor(req, res, next, this);
            else if (this.mode === MODES.test) await this.apiTestInterceptor(req, res, next, this);
        });
    }

    static getRequestKeyByAsyncStore() {
        return Object.keys(requests).find(key => {
            return requests[key].asyncStore === asyncLocalStorage.getStore();
        });
    }

    updateTrace(asyncId, triggerAsyncId) {
        for (let i = 0; i < Object.keys(requests).length; i++) {
            if (requests[Object.keys(requests)[i]].trace.includes(triggerAsyncId)) {
                requests[Object.keys(requests)[i]].trace.push(asyncId);
                break;
            }
        }
    }

    configureMongoosePlugin() {
        let self = this;
        mongoose.plugin((schema) => {
            schema.pre(methods, async function() {
                if (asyncLocalStorage.getStore() === undefined) return;
                logWithStoreId('mongo pre');
                this.asyncStore = asyncLocalStorage.getStore();
                this.mongoReqId = v4();
                try {
                    let request = requests[Pytagora.getRequestKeyByAsyncStore()];
                    if (self.mode === MODES.capture && request) {
                        var mongoRes = await self.getMongoDocs(this);

                        request.intermediateData.push({
                            type: 'mongo',
                            req: mongoRes.req,
                            mongoReqId: this.mongoReqId,
                            preQueryRes: mongoRes.mongoDocs
                        });
                    }
                } catch (e) {
                    console.error(_.pick(this, ['op', '_conditions', '_doc']), e);
                }
            });

            schema.post(methods, async function(...args) {
                let doc = args[0];
                let next = args[1];
                if (this.asyncStore === undefined) return;
                try {
                    asyncLocalStorage.enterWith(this.asyncStore);
                    logWithStoreId('mongo post');
                    var mongoRes = await self.getMongoDocs(this);

                    if (self.mode === MODES.test) {
                        testingRequests[this.asyncStore].mongoQueriesTest++;
                        let request = testingRequests[this.asyncStore];
                        let data = request.intermediateData.find(d => d.type === 'mongo' &&
                            d.req.op === this.op &&
                            JSON.stringify(d.req.options) === JSON.stringify(this.options) &&
                            JSON.stringify(d.req._conditions) === JSON.stringify(this._conditions));
                        if (data &&
                            (JSON.stringify(data.mongoRes) !== JSON.stringify(doc) || JSON.stringify(data.postQueryRes) !== JSON.stringify(mongoRes.mongoDocs))) {
                            let error = 'Mongo query gave different result!';
                            testingRequests[this.asyncStore].errors.push(error);
                        }
                    } else if (self.mode === MODES.capture) {
                        let request = requests[Pytagora.getRequestKeyByAsyncStore()];
                        if (request) {
                            request.mongoQueriesCapture++;
                            request.intermediateData.forEach((intData, i) => {
                                if (intData.mongoReqId === this.mongoReqId) {
                                    request.intermediateData[i].mongoRes = doc;
                                    request.intermediateData[i].postQueryRes = mongoRes.mongoDocs;
                                }
                            });
                        }
                    }
                } catch (e) {
                    console.error(e);
                }
                if (next) next();
            });
        });
    }

    async getMongoDocs(self) {
        let collection, req;
        let query = self._conditions;
        if (self instanceof mongoose.Query) {
            collection = _.get(self, '_collection.collectionName');
            req = _.extend({collection}, _.pick(self, ['op', 'options', '_conditions', '_fields', '_update', '_path', '_distinct', '_doc']));
        } else if (self instanceof mongoose.Model) {
            collection = self.constructor.collection.collectionName;
            req = {
                collection,
                op: self.$__.op,
                options: self.$__.saveOptions,
                _doc: self._doc
            }
        }

        let mongoDocs = await mongoose.connection.db.collection(collection).find(this.convertObjectId(query || {})).toArray();

        return {req, mongoDocs}
    }

    convertObjectId(obj) {
        for (let key in obj) {
            if (key === "_id") {
                if(ObjectId.isValid(obj[key])){
                    obj[key] = new ObjectId(obj[key]);
                }
            } else if (typeof obj[key] === 'object') {
                convertObjectId(obj[key]);
            }
        }
        return obj;
    }

    async apiCaptureInterceptor(req, res, next) {
        if (!this.codeCoverage.initLines) this.codeCoverage.initLines = await this.instrumenter.getInitLinesOfCode();
        let eid = executionAsyncId();
        // createHook({ init() {} }).enable();
        req.id = v4();
        requests[req.id] = _.extend(requests[req.id], {
            id: req.id,
            endpoint: req.path,
            url: 'http://' + req.headers.host + req.url,
            body: req.body,
            method: req.method,
            headers: req.headers,
            responseData: null,
            traceId: eid,
            trace: [eid],
            intermediateData: [],
            query: req.query,
            params: req.params,
            asyncStore: idSeq,
            mongoQueriesCapture: 0
        });

        //todo check what else needs to be added eg. res.json, res.end, res.write,...
        const _send = res.send;
        const _redirect = res.redirect;
        const finishCapture = (responseBody) => {
            logEndpointCaptured(req.path, req.method, req.body, req.query, responseBody);
        }

        res.send = function(body) {
            logWithStoreId('send');
            requests[req.id].responseData = body;
            requests[req.id].traceLegacy = requests[req.id].trace;
            requests[req.id].trace = [];
            if (loggingEnabled) Pytagora.saveCaptureToFile(requests[req.id]);
            _send.call(this, body);
            finishCapture(body);
        };

        res.redirect = function(redirectUrl) {
            logWithStoreId('redirect');
            requests[req.id].responseData = {
                'type': 'redirect',
                'url': redirectUrl
            };
            if (loggingEnabled) Pytagora.saveCaptureToFile(requests[req.id]);
            _redirect.call(this, redirectUrl);
            finishCapture();
        };


        asyncLocalStorage.run(idSeq++, () => {
            logWithStoreId('start');
            next();
        });
    }

    static saveCaptureToFile(reqData) {
        let endpointFileName = `./pytagora_data/${reqData.endpoint.replace(/\//g, '|')}.json`;
        if (!FS.existsSync(endpointFileName)) FS.writeFileSync(endpointFileName, JSON.stringify([reqData]));
        else {
            let fileContent = JSON.parse(FS.readFileSync(endpointFileName));
            let identicalRequestIndex = fileContent.findIndex(req => {
                return _.isEqual(req.pytagoraBody, reqData.pytagoraBody) &&
                    req.method === reqData.method &&
                    _.isEqual(req.query, reqData.query) &&
                    _.isEqual(req.params, reqData.params);
            });

            if (identicalRequestIndex === -1) {
                FS.writeFileSync(endpointFileName, JSON.stringify(fileContent.concat([reqData])));
            } else {
                fileContent[identicalRequestIndex] = reqData;
                let storeData = typeof fileContent === 'string' ? fileContent : JSON.stringify(fileContent);
                FS.writeFileSync(endpointFileName, storeData);
            }
        }
    }

    async apiTestInterceptor(req, res, next) {
        let request = await this.getRequestMockDataById(req);
        if (!request) return console.error('No request found for', req.path, req.method, req.body, req.query, req.params);
        this.RedisInterceptor.setIntermediateData(request.intermediateData);
        let reqId = idSeq++;
        testingRequests[reqId] = _.extend({
            mongoQueriesTest: 0,
            errors: []
        }, request);

        // const self = this;
        //todo check what else needs to be added eg. res.json, res.end, res.write,...
        const _send = res.send;
        const _redirect = res.redirect;

        res.send = function(body) {
            logWithStoreId('testing send');
            if (testingRequests[reqId].mongoQueriesCapture !== testingRequests[reqId].mongoQueriesTest) testingRequests[reqId].errors.push('Some mongo queries have not been executed!');
            global.Pytagora.request = {
                id: testingRequests[reqId].id,
                errors: testingRequests[reqId].errors
            };
            _send.call(this, body);
        };

        res.redirect = function(url) {
            logWithStoreId('testing redirect');
            if (testingRequests[reqId].mongoQueriesCapture !== testingRequests[reqId].mongoQueriesTest) testingRequests[reqId].errors.push('Some mongo queries have not been executed!');
            global.Pytagora.request = {
                id: testingRequests[reqId].id,
                errors: testingRequests[reqId].errors
            };
            _redirect.call(this, url);
        };

        asyncLocalStorage.run(reqId, () => {
            logWithStoreId('Starting testing...');
            next();
        });
    }

    compareResponse(a, b) {
        return typeof a !== typeof b ? false :
            typeof a === 'string' && a.toLowerCase().includes('<!doctype html>') && b.toLowerCase().includes('<!doctype html>') ? true : //todo make appropriate check
                typeof a === 'object' ? this.compareJson(a,b) : a === b;
    }

    compareJson(a, b) {
        let aProps = Object.getOwnPropertyNames(a);
        let bProps = Object.getOwnPropertyNames(b);
        if (aProps.length !== bProps.length) {
            return false;
        }
        for (let i = 0; i < aProps.length; i++) {
            let propName = aProps[i];
            if (a[propName] !== b[propName]) {
                if (typeof a[propName] === 'object') {
                    if (!this.compareJson(a[propName], b[propName]))
                        return false;
                } else
                    return false;
            }
        }
        return true;
    }

    async getRequestMockDataById(req) {
        let path = `./pytagora_data/${req.path.replace(/\//g, '|')}.json`;
        if (!FS.existsSync(path)) return;
        let capturedRequests = JSON.parse(await FS.promises.readFile(path, 'utf8'));
        return capturedRequests.find(request => request.id === req.query.reqId);
    }

    getRequestMockData(capturedRequests, endpoint, method, body, query, params) {
        return capturedRequests.find(request => {
            return request.endpoint === endpoint &&
                request.method === method &&
                _.isEqual(request.body, body) &&
                _.isEqual(request.query, query) &&
                _.isEqual(request.params, params);
        });
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
        _.keys(requests).forEach(k => requests[k].intermediateData.push({
            type: 'redis',
            request, response
        }));
    }

    convertToRegularObject(obj) {
        let seen = [];
        return JSON.parse(JSON.stringify(obj, function(key, value) {
            if (typeof value === 'object' && value !== null) {
                if (seen.indexOf(value) !== -1) {
                    return;
                }
                seen.push(value);
            }
            return value;
        }));
    }

}

// export default Pytagora;

module.exports = Pytagora;
