const pythagoraErrors = require("../const/errors");
const MODES = require("../const/modes.json");
const { compareJson, jsonObjToMongo, noUndefined, convertToRegularObject } = require("../utils/common.js");
const { logWithStoreId } = require("../utils/cmdPrint.js");

let tryRequire = require("tryrequire");
let mongoose = tryRequire("mongoose");
const {v4} = require("uuid");
const _ = require("lodash");
const MONGO_METHODS = require("@pythagora.io/pythagora/src/const/mongodb");
let unsupportedMethods = ['aggregate'];

let methods = ['save','find', 'insert', 'update', 'delete', 'deleteOne', 'insertOne', 'updateOne', 'updateMany', 'deleteMany', 'replaceOne', 'replaceOne', 'remove', 'findOneAndUpdate', 'findOneAndReplace', 'findOneAndRemove', 'findOneAndDelete', 'findByIdAndUpdate', 'findByIdAndRemove', 'findByIdAndDelete', 'exists', 'estimatedDocumentCount', 'distinct', 'translateAliases', '$where', 'watch', 'validate', 'startSession', 'diffIndexes', 'syncIndexes', 'populate', 'listIndexes', 'insertMany', 'hydrate', 'findOne', 'findById', 'ensureIndexes', 'createIndexes', 'createCollection', 'create', 'countDocuments', 'count', 'bulkWrite', 'aggregate'];

function mongoObjToJson(originalObj) {
    let obj = _.clone(originalObj);
    if (!obj) return obj;
    else if (obj._bsontype === 'ObjectID') return `ObjectId("${obj.toString()}")`;
    if (Array.isArray(obj)) return obj.map(d => {
        return mongoObjToJson(d)
    });
    obj = convertToRegularObject(obj);

    for (let key in obj) {
        if (!obj[key]) continue;
        if (obj[key]._bsontype === "ObjectID") {
            // TODO label a key as ObjectId better (not through a string)
            obj[key] = `ObjectId("${obj[key].toString()}")`;
        } else if (obj[key] instanceof RegExp) {
            obj[key] = `RegExp("${obj[key].toString()}")`;
        } else if (typeof obj[key] === 'object') {
            obj[key] = mongoObjToJson(obj[key]);
        }
    }
    return obj;
}

async function getCurrentMongoDocs(collection, query, options) {
    return await new Promise((resolve, reject) => {
        global.asyncLocalStorage.run(undefined, async () => {
            let result = await collection.find(query, options);
            resolve(await result.toArray());
        });
    });
}

function extractArguments(method, arguments) {
    const callback = arguments[MONGO_METHODS[method].indexOf('callback')];
    const query = arguments[MONGO_METHODS[method].indexOf('query')];
    const options = arguments[MONGO_METHODS[method].indexOf('options')];

    return {
        query,
        options,
        callback
    }
}

function checkForErrors(method, request) {
    if (unsupportedMethods.includes(method) && request) {
        request.error = pythagoraErrors.mongoMethodNotSupported(method);
    }
}
async function getMongoDocs(self, stage) {
    let collection,
        req,
        op,
        query,
        isModel = self instanceof mongoose.Model,
        isQuery = self instanceof mongoose.Query,
        conditions = self._conditions || self._doc;

    if (isQuery) {
        collection = _.get(self, '_collection.collectionName');
        query = jsonObjToMongo(conditions);
        req = _.extend({collection}, _.pick(self, ['op', 'options', '_conditions', '_fields', '_update', '_path', '_distinct', '_doc']));
    } else if (isModel) {
        op = self.$op || self.$__.op;
        if (op !== 'validate') conditions = _.pick(self._doc, '_id');
        query = jsonObjToMongo(conditions)
        collection = self.constructor.collection.collectionName;
        req = {
            collection,
            op: op,
            options: self.$__.saveOptions,
            _doc: self._doc
        }
    }

    let mongoDocs = [];
    // TODO make a better way to ignore some queries
    if (query && req && req.op) {
        let findQuery = noUndefined(query);//jsonObjToMongo(noUndefined(query));
        let mongoRes = await new Promise(async (resolve, reject) => {
            global.asyncLocalStorage.run(undefined, async () => {
                if (isQuery) {
                    let explaination = await self.model.find(findQuery).explain();
                    try {
                        findQuery = Array.isArray(explaination) ?
                            (explaination[0].command ? explaination[0].command.filter : explaination[0].queryPlanner.parsedQuery) :
                            explaination.command.filter;
                    } catch (e) {
                        console.error('explaination', explaination);
                    }
                }
                resolve(await mongoose.connection.db.collection(collection).find(findQuery).toArray());
            });
        });

        mongoDocs = mongoObjToJson(Array.isArray(mongoRes) ? mongoRes : [mongoRes]);
    }

    return {req, mongoDocs}
}

function configureMongoosePlugin(pythagora) {
    if (!mongoose) return;
    // mongoose.plugin((schema) => {
    //     schema.pre(methods, async function() {
    //         if (global.asyncLocalStorage.getStore() === undefined ||
    //             this instanceof mongoose.Types.Embedded) return;
    //         logWithStoreId('mongo pre');
    //         this.asyncStore = global.asyncLocalStorage.getStore();
    //         this.mongoReqId = v4();
    //         try {
    //             let request = pythagora.requests[pythagora.getRequestKeyByAsyncStore()];
    //             if (pythagora.mode === MODES.capture && request) {
    //                 let mongoRes = await getMongoDocs(this, 'pre');
    //
    //                 if (mongoRes.error) request.error = mongoRes.error.message;
    //
    //                 request.intermediateData.push({
    //                     type: 'mongo',
    //                     req: mongoObjToJson(_.omit(mongoRes.req, '_doc')),
    //                     mongoReqId: this.mongoReqId,
    //                     preQueryRes: mongoObjToJson(mongoRes.mongoDocs)
    //                 });
    //
    //             } else {
    //                 this.originalConditions = mongoObjToJson(this._conditions);
    //             }
    //         } catch (e) {
    //             console.error(_.pick(this, ['op', '_conditions', '_doc']), e);
    //         }
    //     });
    //
    //     schema.post(methods, async function(...args) {
    //         let doc = args[0];
    //         let next = args[1];
    //         if (this.asyncStore === undefined ||
    //             this instanceof mongoose.Types.Embedded) return next ? next() : null;
    //
    //         await new Promise(((resolve, reject) => {
    //             global.asyncLocalStorage.run(this.asyncStore, async() => {
    //                 try {
    //                     logWithStoreId('mongo post');
    //                     var mongoRes = await getMongoDocs(this, 'post');
    //
    //                     if (pythagora.mode === MODES.test) {
    //                         pythagora.testingRequests[this.asyncStore].mongoQueriesTest++;
    //                         let request = pythagora.testingRequests[this.asyncStore];
    //                         let mongoReq = mongoObjToJson(_.omit(mongoRes.req, '_doc'));
    //                         let capturedData = request.intermediateData.find(d => {
    //                             return !d.processed &&
    //                                 d.type === 'mongo' &&
    //                                 d.req.op === mongoReq.op &&
    //                                 d.req.collection === mongoReq.collection &&
    //                                 compareJson(d.req.options, mongoObjToJson(mongoReq.options), true) &&
    //                                 compareJson(d.req._conditions, this.originalConditions, true);
    //                         });
    //                         if (capturedData) capturedData.processed = true;
    //                         if (capturedData &&
    //                             (!compareJson(capturedData.mongoRes, mongoObjToJson(doc)) || !compareJson(capturedData.postQueryRes, mongoObjToJson(mongoRes.mongoDocs)))
    //                         ) {
    //                             pythagora.testingRequests[this.asyncStore].errors.push(pythagoraErrors.mongoResultDifferent);
    //                         } else if (!capturedData) {
    //                             pythagora.testingRequests[this.asyncStore].errors.push(pythagoraErrors.mongoQueryNotFound);
    //                         }
    //                     } else if (pythagora.mode === MODES.capture) {
    //                         let request = pythagora.requests[pythagora.getRequestKeyByAsyncStore()];
    //                         if (request) {
    //                             request.mongoQueriesCapture++;
    //                             request.intermediateData.forEach((intData, i) => {
    //                                 if (intData.mongoReqId === this.mongoReqId) {
    //                                     request.intermediateData[i].mongoRes = mongoObjToJson(doc);
    //                                     request.intermediateData[i].postQueryRes = mongoObjToJson(mongoRes.mongoDocs);
    //                                 }
    //                             });
    //                         }
    //                     }
    //                     if (next) {
    //                         next();
    //                     } else {
    //                         resolve();
    //                     }
    //                 } catch (e) {
    //                     console.error(e);
    //                 }
    //             });
    //         }));
    //     });
    // });
}

async function cleanupDb() {
    const collections = await mongoose.connection.db.collections();
    for (const collection of collections) {
        await collection.drop();
    }
}

function createCaptureIntermediateData(db, collection, query, options, preQueryRes) {
    return {
        type: 'mongodb',
        id: v4(), // former mongoReqId
        preQueryRes: mongoObjToJson(preQueryRes),
        query: mongoObjToJson(query), // former 'res'
        options,
        db,
        collection
    };
}

async function postHook(collection, cursor, query, options, request, intermediateData) {
    let mongoResult = cursor.toArray ? await cursor.toArray() : cursor;
    if (global.Pythagora.mode === MODES.capture) {
        request.mongoQueriesCapture++;
        let postQueryRes = await getCurrentMongoDocs(collection, query, options);
        intermediateData.mongoRes = mongoObjToJson(mongoResult);
        intermediateData.postQueryRes = mongoObjToJson(postQueryRes);
        request.intermediateData.push(_.clone(intermediateData));
    }
}

async function preHook(collection, query, options, request) {
    this.mongoReqId = v4();
    try {

        if (global.Pythagora.mode === MODES.capture && request) {
            let mongoRes = await new Promise((resolve, reject) => {
                global.asyncLocalStorage.run(undefined, async () => {
                    let result = await collection.find(query, options);
                    resolve(await result.toArray());
                });
            });

            request.intermediateData.push({
                type: 'mongo',
                options: options,
                mongoReqId: this.mongoReqId,
                req: mongoObjToJson(_.omit(query, '_doc')),
                preQueryRes: mongoObjToJson(mongoRes)
            });

        } else {
            this.originalConditions = mongoObjToJson(this._conditions);
        }
    } catch (e) {
        console.error('Something went wrong while processing mongo pre hook', e);
    }
}

async function postHook2(collection, query, options, request) {
    await new Promise(((resolve, reject) => {
        global.asyncLocalStorage.run(this.asyncStore, async() => {
            try {
                logWithStoreId('mongo post');
                var mongoRes = await getMongoDocs(this, 'post');

                if (pythagora.mode === MODES.test) {
                    pythagora.testingRequests[this.asyncStore].mongoQueriesTest++;
                    let request = pythagora.testingRequests[this.asyncStore];
                    let mongoReq = mongoObjToJson(_.omit(mongoRes.req, '_doc'));
                    let capturedData = request.intermediateData.find(d => {
                        return !d.processed &&
                            d.type === 'mongo' &&
                            d.req.op === mongoReq.op &&
                            d.req.collection === mongoReq.collection &&
                            compareJson(d.req.options, mongoObjToJson(mongoReq.options), true) &&
                            compareJson(d.req._conditions, this.originalConditions, true);
                    });
                    if (capturedData) capturedData.processed = true;
                    if (capturedData &&
                        (!compareJson(capturedData.mongoRes, mongoObjToJson(doc)) || !compareJson(capturedData.postQueryRes, mongoObjToJson(mongoRes.mongoDocs)))
                    ) {
                        pythagora.testingRequests[this.asyncStore].errors.push(pythagoraErrors.mongoResultDifferent);
                    } else if (!capturedData) {
                        pythagora.testingRequests[this.asyncStore].errors.push(pythagoraErrors.mongoQueryNotFound);
                    }
                } else if (pythagora.mode === MODES.capture) {
                    if (request) {
                        request.mongoQueriesCapture++;
                        request.intermediateData.forEach((intData, i) => {
                            if (intData.mongoReqId === this.mongoReqId) {
                                request.intermediateData[i].mongoRes = mongoObjToJson(doc);
                                request.intermediateData[i].postQueryRes = mongoObjToJson(mongoRes.mongoDocs);
                            }
                        });
                    }
                }
                if (next) {
                    next();
                } else {
                    resolve();
                }
            } catch (e) {
                console.error(e);
            }
        });
    }));
}

module.exports = {
    configureMongoosePlugin,
    cleanupDb,
    preHook,
    postHook,
    mongoObjToJson,
    getCurrentMongoDocs,
    extractArguments,
    checkForErrors,
    createCaptureIntermediateData
}
