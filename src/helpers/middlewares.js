const MODES = require("../const/modes.json");
const { getCircularReplacer, compareResponse } = require("../utils/common.js");
const pythagoraErrors = require("../const/errors");
const { logEndpointNotCaptured, logEndpointCaptured, logWithStoreId } = require("../utils/cmdPrint.js");
const { patchJwtVerify, unpatchJwtVerify } = require("../patches/jwt.js");
const { prepareDB } = require("./mongodb.js");
const { PYTHAGORA_TESTS_DIR } = require("../const/common.js");

const bodyParser = require("body-parser");
const {v4} = require("uuid");
const _ = require("lodash");
let  { executionAsyncId } = require('node:async_hooks');
const fs = require('fs');


function setUpExpressMiddlewares(app) {

    const pythagoraMiddlwares = {
        ignoreMiddleware: (req, res, next) => {
            if (!global.Pythagora ||
                !app.isPythagoraExpressInstance ||
                req.url.match(/(.*)\.[a-zA-Z0-9]{0,5}$/)) req.pythagoraIgnore = true;

            if (global.Pythagora.mode === MODES.capture &&
                global.Pythagora.pick &&
                !global.Pythagora.pick.includes(req.url)) req.pythagoraIgnore = true;

            if (global.Pythagora.mode === MODES.capture &&
                global.Pythagora.ignore &&
                global.Pythagora.ignore.includes(req.url)) req.pythagoraIgnore = true;

            return next();
        },

        prepareTestingMiddleware: async (req, res, next) => {
            if (!req.pythagoraIgnore && global.Pythagora.mode === MODES.test) {
                await prepareDB(global.Pythagora, req);
            }

            next();
        },

        setUpPythagoraDataMiddleware: (req, res, next) => {
            if (req.pythagoraIgnore || global.Pythagora.mode !== MODES.capture) return next();
            // if (Object.keys(pythagora.requests).length === 0) pythagora.setExitListener();
            if (!req.id) req.id = v4();
            let eid = executionAsyncId();
            if (!global.Pythagora.requests[req.id]) global.Pythagora.requests[req.id] = {
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
                asyncStore: global.Pythagora.idSeq,
                mongoQueriesCapture: 0
            };

            if (req.is('multipart/form-data')) global.Pythagora.requests[req.id].error = "Uploading multipart/form-data is not supported yet!";

            // if (!req.is('multipart/form-data')) {
            //     let data = '';
            //     const inputStream = req;
            //     const duplexStream = duplexify();
            //
            //     duplexStream.setReadable(inputStream);
            //     req.duplexStream = duplexStream;
            //     duplexStream.on('data', (chunk) => {
            //         data+=chunk.toString();
            //     });
            //     duplexStream.on('end', () => {
            //         pythagora.requests[req.id].body = data;
            //     });
            // }
            next();
        },

        setUpInterceptorMiddleware: async (req, res, next) => {
            if (req.pythagoraIgnore) return next();
            global.Pythagora.RedisInterceptor.setMode(global.Pythagora.mode);
            if (global.Pythagora.mode === MODES.capture) await apiCaptureInterceptor(req, res, next, global.Pythagora);
            else if (global.Pythagora.mode === MODES.test) await apiTestInterceptor(req, res, next, global.Pythagora);
        }

    };
    app.use(pythagoraMiddlwares.ignoreMiddleware);

    app.use(pythagoraMiddlwares.prepareTestingMiddleware);

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({
        extended: true
    }));

    app.use(pythagoraMiddlwares.setUpPythagoraDataMiddleware);

    app.use(pythagoraMiddlwares.setUpInterceptorMiddleware);
}

async function apiCaptureInterceptor(req, res, next, pythagora) {
    //todo check what else needs to be added eg. res.json, res.end, res.write,...
    const _send = res.send;
    const _sendFile = res.sendFile;
    const _end = res.end;
    const _redirect = res.redirect;
    const _status = res.status;
    const _json = res.json;
    const finishCapture = (request, responseBody) => {
        if (request.error) {
            return logEndpointNotCaptured(req.originalUrl, req.method, request.error);
        }
        if (pythagora.loggingEnabled) saveCaptureToFile(pythagora.requests[req.id], pythagora);
        logEndpointCaptured(req.originalUrl, req.method, req.body, req.query, responseBody);
    }
    const storeRequestData = (statusCode, id, body) => {
        pythagora.requests[id].responseData = !body || statusCode === 204 ? '' :
            typeof body === 'string' ? body : JSON.stringify(body);
        pythagora.requests[id].traceLegacy = pythagora.requests[req.id].trace;
        pythagora.requests[id].statusCode = statusCode;
        pythagora.requests[id].trace = [];
    }

    res.status = function(code) {
        logWithStoreId('status');
        pythagora.requests[req.id].statusCode = code;
        return _status.call(this, code);
    }

    res.json = function(json) {
        logWithStoreId('json');
        if (pythagora.requests[req.id].finished) return _json.call(this, json);
        storeRequestData(res.statusCode, req.id, json);
        if (!pythagora.requests[req.id].finished) finishCapture(pythagora.requests[req.id], json);
        pythagora.requests[req.id].finished = true;
        return _json.call(this, json);
    }

    res.end = function(body) {
        logWithStoreId('end');
        if (pythagora.requests[req.id].finished) return _end.call(this, body);
        let path = '.' + this.req.originalUrl;
        //todo find better solution for storing static files to body
        if (body === undefined && fs.existsSync(path) && fs.lstatSync(path).isFile()) {
            body = fs.readFileSync(path);
            body = body.toString();
        }
        storeRequestData(res.statusCode, req.id, body);
        if (!pythagora.requests[req.id].finished) finishCapture(pythagora.requests[req.id], body);
        pythagora.requests[req.id].finished = true;
        _end.call(this, body);
    };

    res.send = function(body) {
        logWithStoreId('send');
        if (pythagora.requests[req.id].finished) return _send.call(this, pythagora.requests[req.id].responseData);
        storeRequestData(res.statusCode, req.id, body);
        if (!pythagora.requests[req.id].finished) finishCapture(pythagora.requests[req.id], body);
        pythagora.requests[req.id].finished = true;
        _send.call(this, pythagora.requests[req.id].responseData);
    };

    res.sendFile = function(path) {
        let file;
        logWithStoreId('sendFile');
        if (path && fs.existsSync(path) && fs.lstatSync(path).isFile()) {
            file = fs.readFileSync(path);
            if (file) file = file.toString();
        }
        storeRequestData(res.statusCode, req.id, file);
        if (!pythagora.requests[req.id].finished) finishCapture(pythagora.requests[req.id], file);
        pythagora.requests[req.id].finished = true;
        _sendFile.call(this, path);
    };

    res.redirect = function(redirectUrl) {
        logWithStoreId('redirect');
        pythagora.requests[req.id].statusCode = res.statusCode;
        if (pythagora.requests[req.id].finished) return _redirect.call(this, redirectUrl);
        pythagora.requests[req.id].responseData = {
            'type': 'redirect',
            'url': redirectUrl
        };
        finishCapture(pythagora.requests[req.id]);
        pythagora.requests[req.id].finished = true;
        _redirect.call(this, redirectUrl);
    };


    global.asyncLocalStorage.run(pythagora.idSeq++, () => {
        logWithStoreId('start');
        next();
    });
}

async function apiTestInterceptor(req, res, next, pythagora) {
    let request = await pythagora.getRequestMockDataById(req);
    if (!request) {
        // TODO we're overwriting requests during the capture phase so this might happen durign the final filtering of the capture
        console.error('No request found for', req.path, req.method, req.body, req.query, req.params);
        return next();
    }

    let timestamp = new Date(request.createdAt).getTime();
    pythagora.tempVars.clockTimestamp = timestamp;

    pythagora.RedisInterceptor.setIntermediateData(request.intermediateData);
    let reqId = pythagora.idSeq++;
    pythagora.testingRequests[reqId] = _.extend({
        mongoQueriesTest: [],
        errors: []
    }, request);

    //todo check what else needs to be added eg. res.json, res.end, res.write,...
    const _end = res.end;
    const _send = res.send;
    const _redirect = res.redirect;

    res.end = function(body) {
        logWithStoreId('testing end');
        checkForFinalErrors(reqId, pythagora);
        setGlobalRequest(reqId, pythagora);
        _end.call(this, body);
    };

    res.send = function(body) {
        logWithStoreId('testing send');
        checkForFinalErrors(reqId, pythagora);
        setGlobalRequest(reqId, pythagora);
        _send.call(this, body);
    };

    res.redirect = function(url) {
        logWithStoreId('testing redirect');
        checkForFinalErrors(reqId, pythagora);
        setGlobalRequest(reqId, pythagora);
        _redirect.call(this, url);
    };

    global.asyncLocalStorage.run(reqId, () => {
        logWithStoreId('Starting testing...');
        next();
    });
}

function setGlobalRequest(reqId, pythagora) {
    global.Pythagora.request = {
        id: pythagora.testingRequests[reqId].id,
        errors: _.clone(pythagora.testingRequests[reqId].errors),
        intermediateData: pythagora.testingRequests[reqId].intermediateData
    };
}

function checkForFinalErrors(reqId, pythagora) {
    if (pythagora.testingRequests[reqId].mongoQueriesCapture > pythagora.testingRequests[reqId].mongoQueriesTest &&
        !pythagora.testingRequests[reqId].errors.filter((e) => e.type === 'mongoNotExecuted').length
    ) {
        pythagora.testingRequests[reqId].errors.push({
            type: 'mongoNotExecuted',
            intermediateData: pythagora.testingRequests[reqId].testIntermediateData
        });
    }
    if (pythagora.testingRequests[reqId].mongoQueriesCapture < pythagora.testingRequests[reqId].mongoQueriesTest &&
        !pythagora.testingRequests[reqId].errors.filter((e) => e.type === 'mongoExecutedTooManyTimes').length
    ) {
        pythagora.testingRequests[reqId].errors.push({
            type: 'mongoExecutedTooManyTimes',
            intermediateData: pythagora.testingRequests[reqId].testIntermediateData
        });
    }
}

function saveCaptureToFile(reqData, pythagora) {
    reqData.pythagoraVersion = pythagora.version;
    reqData.createdAt = new Date().toISOString();
    let endpointFileName = `./${PYTHAGORA_TESTS_DIR}/${reqData.endpoint.replace(/\//g, '|')}.json`;
    if (!fs.existsSync(endpointFileName)) fs.writeFileSync(endpointFileName, JSON.stringify([reqData], getCircularReplacer(), 2));
    else {
        let fileContent = JSON.parse(fs.readFileSync(endpointFileName));
        let identicalRequestIndex = fileContent.findIndex(req => {
            return req && _.isEqual(req.body, reqData.body) &&
                req.method === reqData.method &&
                _.isEqual(req.query, reqData.query) &&
                _.isEqual(req.params, reqData.params) &&
                _.isEqual(req.statusCode, reqData.statusCode) &&
                compareResponse(req.responseData, reqData.responseData);
        });

        if (identicalRequestIndex === -1) {
            fs.writeFileSync(endpointFileName, JSON.stringify(fileContent.concat([reqData]), getCircularReplacer(), 2));
        } else {
            if (pythagora.requests[fileContent[identicalRequestIndex].id]) delete pythagora.requests[fileContent[identicalRequestIndex].id];
            fileContent[identicalRequestIndex] = reqData;
            let storeData = typeof fileContent === 'string' ? fileContent : JSON.stringify(fileContent, getCircularReplacer(), 2);
            fs.writeFileSync(endpointFileName, storeData);
        }
    }
}

module.exports = {
    setUpExpressMiddlewares
}
