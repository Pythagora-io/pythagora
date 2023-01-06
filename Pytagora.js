import {v4} from 'uuid';
import { createHook, triggerAsyncId, executionAsyncId } from 'async_hooks';
import { BatchInterceptor } from '@mswjs/interceptors';
import nodeInterceptors from '@mswjs/interceptors/lib/presets/node.js';
import mongo from "mongoose";
import express from "express";
import FS from "fs";
import _ from "lodash";
import { AsyncLocalStorage, AsyncResource } from 'node:async_hooks';

const asyncLocalStorage = new AsyncLocalStorage({onPropagate: (store, triggerAsyncId) => {
        console.log('----')
    }
});

function logWithStoreId(msg) {
    const id = asyncLocalStorage.getStore();
    console.log(`${id !== undefined ? id : '-'}:`, msg);
}

let idSeq = 0;
let loggingEnabled = true;
let requests = {};
let methods = ['find', 'insert', 'update', 'delete', 'deleteOne', 'insertOne', 'updateOne', 'updateMany', 'deleteMany', 'replaceOne', 'replaceOne', 'remove', 'findOneAndUpdate', 'findOneAndReplace', 'findOneAndRemove', 'findOneAndDelete', 'findByIdAndUpdate', 'findByIdAndRemove', 'findByIdAndDelete', 'exists', 'estimatedDocumentCount', 'distinct', 'translateAliases', '$where', 'watch', 'validate', 'startSession', 'diffIndexes', 'syncIndexes', 'populate', 'listIndexes', 'insertMany', 'init', 'hydrate', 'findOne', 'findById', 'ensureIndexes', 'createIndexes', 'createCollection', 'create', 'countDocuments', 'count', 'bulkWrite', 'aggregate'];
mongo.plugin((schema) => {
    schema.pre(methods, function() {
        if (asyncLocalStorage.getStore() === undefined) return;
        logWithStoreId('mongo pre');
        // createHook({ init() {} }).enable();
        // this.preAsyncId = executionAsyncId();
        this.asyncStore = asyncLocalStorage.getStore();
        this.mongoReqId = v4();
        try {
            // requests[Pytagora.getRequestKeyByTrace()].intermediateData.push({
            requests[Pytagora.getRequestKeyByAsyncStore()].intermediateData.push({
                type: 'mongo',
                req: _.pick(this, ['op', 'options', '_conditions', '_fields', '_update', '_path', '_distinct', '_doc']),
                // preAsyncId: this.preAsyncId,
                mongoReqId: this.mongoReqId
            });
        } catch (e) {
            console.log(e);
        }
    });

    schema.post(methods, function(doc, next) {
        if (this.asyncStore === undefined) return;
        try {
            asyncLocalStorage.enterWith(this.asyncStore);
            logWithStoreId('mongo post');
            let request = requests[Pytagora.getRequestKeyByAsyncStore()];
            // Pytagora.mergeTraces(triggerAsyncId(), executionAsyncId(), this.preAsyncId);
            request.intermediateData.forEach((intData, i) => {
                if (intData.mongoReqId === this.mongoReqId) {
                    request.intermediateData[i].res = doc;
                }
            });
            if (!request.intermediateData.find(intData => intData.mongoReqId === this.mongoReqId)) {
                console.log('---')
            }
        } catch (e) {
            console.log(e);
        }
        if (next) next();
    });
});
let app = express();

export default class Pytagora {

    constructor() {
        this.setUpExpressMiddleware(app);

        createHook({
            init: (asyncId, type, triggerAsyncId, resource) => {
                this.updateTrace(asyncId, triggerAsyncId);
            },
            before: (asyncId) => {
                this.updateTrace(asyncId, triggerAsyncId());
            }
        }).enable();

        this.setUpHttpInterceptor();
    }

    setApp(newApp) {
        app = newApp;
        this.setUpExpressMiddleware(app);
    }

    getApp() {
        return app;
    }

    setUpHttpInterceptor() {
        const interceptor = new BatchInterceptor({
            name: 'my-interceptor',
            interceptors: nodeInterceptors.default,
        })

        interceptor.apply()

        interceptor.on('request', (req, reqId) => this.httpRequestInterceptor(req, reqId, this));
        interceptor.on('response', (res, req) => this.httpResponseInterceptor(res, req, this));
    }

    httpRequestInterceptor(request, requestId, pytagora) {
    }

    httpResponseInterceptor(response, request, pytagora) {
        pytagora.requests[this.getRequestKeyByTrace()].intermediateData.push({
            type: 'outgoing_request',
            request, response
        });
    }

    setUpExpressMiddleware(app) {
        app.use((req, res, next) => {
            this.apiInterceptor(req, res, next, this);
        });
    }

    logStackTrace() {
        return new Error().stack;
        // return Error.captureStackTrace(new Error(), logStackTrace);
    }

    static getRequestKeyByTrace() {
        return Object.keys(requests).find(key => {
            return requests[key].trace.includes(triggerAsyncId());
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

    static mergeTraces(triggerAsyncId, asyncId, preAsyncId) {
        let reqIdToAddTo = Object.keys(requests).find(key => {
            return requests[key].trace.includes(preAsyncId || triggerAsyncId);
        });
        requests[reqIdToAddTo].trace.push(triggerAsyncId);
        requests[reqIdToAddTo].trace.push(asyncId);
    }

    apiInterceptor(req, res, next) {

        let eid = executionAsyncId();
        createHook({ init() {} }).enable();
        req.id = v4();
        requests[req.id] = {
            id: req.id,
            endpoint: req.url,
            body: req.body,
            responseData: null,
            traceId: eid,
            trace: [eid],
            intermediateData: [],
            query: req.query,
            params: req.params,
            asyncStore: idSeq
        };

        const _send = res.send;

        res.send = function(body) {
            // TODO save response data
            requests[req.id].responseData = body;
            requests[req.id].traceLegacy = requests[req.id].trace;
            requests[req.id].trace = [];
            if (loggingEnabled) FS.appendFileSync('pytagoraDebug.json', JSON.stringify(requests[req.id]) + ',\n');
            _send.call(this, body);
        };


        asyncLocalStorage.run(idSeq++, () => {
            logWithStoreId('start');
            next();
        });
    }

    logRequest(req) {
        FS.appendFileSync('pytagoraDebug.json', JSON.stringify(req) + ',\n');
    }

    mongoPreInterceptor() {
        requests[this.getRequestKeyByTrace()].intermediateData.push(this._queryLog);
    }

    mongoInterceptor(schema) {
        // TODO we need to see if this can only be done by iterating through ALL
        // Mongoose hooks (find, update, etc.) or we can connect directly to Mongoose
        schema.pre('find', function() {
            // Save the query object
            this._queryLog = this.getQuery();
        });

        schema.post('find', function(docs) {
            // Save the response object (the documents returned by the query)
            this._queryLog.response = docs;
            // TODO save the query log (not sure if this works or you need to save the req first and then save only the response here
        });
    }

    endRecording() {

    }
}

exports.printMsg = function() {
  console.log("This is a message from the demo package");
}
