const MODES = require("../const/modes.json");
const { jsonObjToMongo, getCircularReplacer } = require("../utils/common.js");
const pytagoraErrors = require("../const/errors.json");
const { logEndpointNotCaptured, logEndpointCaptured, logWithStoreId } = require("../utils/cmdPrint.js");
const { cleanupDb } = require("./mongo.js");

const bodyParser = require("body-parser");
const {v4} = require("uuid");
const _ = require("lodash");
let  { executionAsyncId } = require('node:async_hooks');
const fs = require('fs')


function setUpExpressMiddleware(app, pytagora, mongoose) {
    app.use(async (req,res,next) => {
        if (req.url.match(/(.*)\.[a-zA-Z0-9]{0,5}$/)) {
            req.pytagoraIgnore = true;
            next();
        }
        if (pytagora.mode !== MODES.test) return next();
        let pytagoraDb = 'pytagoraDb';

        let prepareDB = async() => {
            await cleanupDb();

            const testReq = await pytagora.getRequestMockDataById(req);
            if (!testReq) return next();

            let uniqueIds = [];
            for (const data of testReq.intermediateData) {
                if (data.type !== 'mongo') continue;
                let insertData = [];
                for (let doc of data.preQueryRes) {
                    if (!uniqueIds.includes(doc._id)) {
                        uniqueIds.push(doc._id);
                        insertData.push(jsonObjToMongo(doc));
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
        let pytagoraDbConnection = await mongoose.connect(`mongodb://${connection.host}:${connection.port}/${pytagoraDb}`, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        for (const connection of mongoose.connections) {
            if (connection.name !== pytagoraDb) connection.close();
        }
        await prepareDB();
    });

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({
        extended: true
    }));

    app.use((req, res, next) => {
        if (pytagora.mode !== MODES.capture || req.pytagoraIgnore) return next();
        if (!req.id) req.id = v4();
        let eid = executionAsyncId();
        if (!pytagora.requests[req.id]) pytagora.requests[req.id] = {
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
            asyncStore: pytagora.idSeq,
            mongoQueriesCapture: 0
        };

        if (req.is('multipart/form-data')) pytagora.requests[req.id].error = "Uploading multipart/form-data is not supported yet!";

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
        //         pytagora.requests[req.id].body = data;
        //     });
        // }
        next();
    });

    app.use(async (req, res, next) => {
        if (req.pytagoraIgnore) return next();
        pytagora.RedisInterceptor.setMode(pytagora.mode);
        if (pytagora.mode === MODES.capture) await apiCaptureInterceptor(req, res, next, pytagora);
        else if (pytagora.mode === MODES.test) await apiTestInterceptor(req, res, next, pytagora);
    });
}

async function apiCaptureInterceptor(req, res, next, pytagora) {
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
        if (pytagora.loggingEnabled) saveCaptureToFile(pytagora.requests[req.id], pytagora);
        logEndpointCaptured(req.originalUrl, req.method, req.body, req.query, responseBody);
    }
    const storeRequestData = (statusCode, id, body) => {
        pytagora.requests[id].responseData = !body || statusCode === 204 ? '' :
            typeof body === 'string' ? body : JSON.stringify(body);
        pytagora.requests[id].traceLegacy = pytagora.requests[req.id].trace;
        pytagora.requests[id].statusCode = statusCode;
        pytagora.requests[id].trace = [];
    }

    res.status = function(code) {
        logWithStoreId('status');
        pytagora.requests[req.id].statusCode = code;
        return _status.call(this, code);
    }

    res.json = function(json) {
        logWithStoreId('json');
        if (pytagora.requests[req.id].finished) return _json.call(this, json);
        storeRequestData(res.statusCode, req.id, json);
        if (!pytagora.requests[req.id].finished) finishCapture(pytagora.requests[req.id], json);
        pytagora.requests[req.id].finished = true;
        return _json.call(this, json);
    }

    res.end = function(body) {
        logWithStoreId('end');
        if (pytagora.requests[req.id].finished) return _end.call(this, body);
        let path = '.' + this.req.originalUrl;
        //todo find better solution for storing static files to body
        if (body === undefined && fs.existsSync(path) && fs.lstatSync(path).isFile()) {
            body = fs.readFileSync(path);
            body = body.toString();
        }
        storeRequestData(res.statusCode, req.id, body);
        if (!pytagora.requests[req.id].finished) finishCapture(pytagora.requests[req.id], body);
        pytagora.requests[req.id].finished = true;
        _end.call(this, body);
    };

    res.send = function(body) {
        logWithStoreId('send');
        if (pytagora.requests[req.id].finished) return _send.call(this, pytagora.requests[req.id].responseData);
        storeRequestData(res.statusCode, req.id, body);
        if (!pytagora.requests[req.id].finished) finishCapture(pytagora.requests[req.id], body);
        pytagora.requests[req.id].finished = true;
        _send.call(this, pytagora.requests[req.id].responseData);
    };

    res.sendFile = function(path) {
        let file;
        logWithStoreId('sendFile');
        if (path && fs.existsSync(path) && fs.lstatSync(path).isFile()) {
            file = fs.readFileSync(path);
            if (file) file = file.toString();
        }
        storeRequestData(res.statusCode, req.id, file);
        if (!pytagora.requests[req.id].finished) finishCapture(pytagora.requests[req.id], file);
        pytagora.requests[req.id].finished = true;
        _sendFile.call(this, path);
    };

    res.redirect = function(redirectUrl) {
        logWithStoreId('redirect');
        pytagora.requests[req.id].statusCode = res.statusCode;
        if (pytagora.requests[req.id].finished) return _redirect.call(this, redirectUrl);
        pytagora.requests[req.id].responseData = {
            'type': 'redirect',
            'url': redirectUrl
        };
        finishCapture(pytagora.requests[req.id]);
        pytagora.requests[req.id].finished = true;
        _redirect.call(this, redirectUrl);
    };


    global.asyncLocalStorage.run(pytagora.idSeq++, () => {
        logWithStoreId('start');
        next();
    });
}

async function apiTestInterceptor(req, res, next, pytagora) {
    let request = await pytagora.getRequestMockDataById(req);
    if (!request) {
        // TODO we're overwriting requests during the capture phase so this might happen durign the final filtering of the capture
        console.error('No request found for', req.path, req.method, req.body, req.query, req.params);
        return next();
    }
    pytagora.RedisInterceptor.setIntermediateData(request.intermediateData);
    let reqId = pytagora.idSeq++;
    pytagora.testingRequests[reqId] = _.extend({
        mongoQueriesTest: 0,
        errors: []
    }, request);

    //todo check what else needs to be added eg. res.json, res.end, res.write,...
    const _end = res.end;
    const _send = res.send;
    const _redirect = res.redirect;

    res.end = function(body) {
        logWithStoreId('testing end');
        checkForFinalErrors(reqId, pytagora);
        global.Pytagora.request = {
            id: pytagora.testingRequests[reqId].id,
            errors: _.clone(pytagora.testingRequests[reqId].errors)
        };
        _end.call(this, body);
    };

    res.send = function(body) {
        logWithStoreId('testing send');
        checkForFinalErrors(reqId, pytagora);
        global.Pytagora.request = {
            id: pytagora.testingRequests[reqId].id,
            errors: _.clone(pytagora.testingRequests[reqId].errors)
        };
        _send.call(this, body);
    };

    res.redirect = function(url) {
        logWithStoreId('testing redirect');
        checkForFinalErrors(reqId, pytagora);
        global.Pytagora.request = {
            id: pytagora.testingRequests[reqId].id,
            errors: _.clone(pytagora.testingRequests[reqId].errors)
        };
        _redirect.call(this, url);
    };

    global.asyncLocalStorage.run(reqId, () => {
        logWithStoreId('Starting testing...');
        next();
    });
}

function checkForFinalErrors(reqId, pytagora) {
    if (pytagora.testingRequests[reqId].mongoQueriesCapture > pytagora.testingRequests[reqId].mongoQueriesTest) {
        pytagora.testingRequests[reqId].errors.push(pytagoraErrors.mongoNotExecuted);
    }
    if (pytagora.testingRequests[reqId].mongoQueriesCapture < pytagora.testingRequests[reqId].mongoQueriesTest) {
        pytagora.testingRequests[reqId].errors.push(pytagoraErrors.mongoExecutedTooManyTimes);
    }
}

function saveCaptureToFile(reqData, pytagora) {
    let endpointFileName = `./pytagora_data/${reqData.endpoint.replace(/\//g, '|')}.json`;
    if (!fs.existsSync(endpointFileName)) fs.writeFileSync(endpointFileName, JSON.stringify([reqData], getCircularReplacer()));
    else {
        let fileContent = JSON.parse(fs.readFileSync(endpointFileName));
        let identicalRequestIndex = fileContent.findIndex(req => {
            return req && _.isEqual(req.body, reqData.body) &&
                req.method === reqData.method &&
                _.isEqual(req.query, reqData.query) &&
                _.isEqual(req.params, reqData.params);
        });

        if (identicalRequestIndex === -1) {
            fs.writeFileSync(endpointFileName, JSON.stringify(fileContent.concat([reqData]), getCircularReplacer()));
        } else {
            if (pytagora.requests[fileContent[identicalRequestIndex].id]) delete pytagora.requests[fileContent[identicalRequestIndex].id];
            fileContent[identicalRequestIndex] = reqData;
            let storeData = typeof fileContent === 'string' ? fileContent : JSON.stringify(fileContent, getCircularReplacer());
            fs.writeFileSync(endpointFileName, storeData);
        }
    }
}

module.exports = {
    setUpExpressMiddleware
}
