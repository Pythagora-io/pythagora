const pythagoraErrors = require("../const/errors.json");
const MODES = require("../const/modes.json");
const { mongoObjToJson, compareJson, jsonObjToMongo, noUndefined } = require("../utils/common.js");
const { logWithStoreId } = require("../utils/cmdPrint.js");

let tryRequire = require("tryrequire");
let mongoose = tryRequire("mongoose");
const {v4} = require("uuid");
const _ = require("lodash");

let methods = ['save','find', 'insert', 'update', 'delete', 'deleteOne', 'insertOne', 'updateOne', 'updateMany', 'deleteMany', 'replaceOne', 'replaceOne', 'remove', 'findOneAndUpdate', 'findOneAndReplace', 'findOneAndRemove', 'findOneAndDelete', 'findByIdAndUpdate', 'findByIdAndRemove', 'findByIdAndDelete', 'exists', 'estimatedDocumentCount', 'distinct', 'translateAliases', '$where', 'watch', 'validate', 'startSession', 'diffIndexes', 'syncIndexes', 'populate', 'listIndexes', 'insertMany', 'hydrate', 'findOne', 'findById', 'ensureIndexes', 'createIndexes', 'createCollection', 'create', 'countDocuments', 'count', 'bulkWrite', 'aggregate'];

async function getMongoDocs(self) {
    let collection,
        req,
        op,
        query,
        isModel = self instanceof mongoose.Model,
        isQuery = self instanceof mongoose.Query,
        conditions = self._conditions || self._doc;

    if (self._mongooseOptions && self._mongooseOptions.populate) return { error: new Error('Mongoose "populate" not supported yet!') };

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
    } else if (self instanceof mongoose.Aggregate) {
        collection = _.get(self, '_model.collection.collectionName');
        req = {
            collection,
            op: 'aggregate',
            _pipeline: self._pipeline,
            _doc: self._doc
        };
        return { error: new Error('Aggregation not supported yet!') };
    }

    let mongoDocs;
    // TODO make a better way to ignore some queries
    if (query && req && req.op) {
        let findQuery = noUndefined(query);//jsonObjToMongo(noUndefined(query));
        let mongoRes = await new Promise(async (resolve, reject) => {
            let originalAsyncStore = global.asyncLocalStorage.getStore();
            self.asyncStore = undefined;
            global.asyncLocalStorage.run(undefined, async () => {
                self.asyncStore = originalAsyncStore;
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
    } else {
        mongoDocs = [];
    }

    return {req, mongoDocs}
}

function configureMongoosePlugin(pythagora) {
    if (!mongoose) return;
    mongoose.plugin((schema) => {
        schema.pre(methods, async function() {
            if (global.asyncLocalStorage.getStore() === undefined ||
                this instanceof mongoose.Types.Embedded) return;
            logWithStoreId('mongo pre');
            this.asyncStore = global.asyncLocalStorage.getStore();
            this.mongoReqId = v4();
            try {
                let request = pythagora.requests[pythagora.getRequestKeyByAsyncStore()];
                if (pythagora.mode === MODES.capture && request) {
                    let mongoRes = await getMongoDocs(this);

                    if (mongoRes.error) request.error = mongoRes.error.message;

                    request.intermediateData.push({
                        type: 'mongo',
                        // req: mongoRes.req,
                        req: mongoObjToJson(_.omit(mongoRes.req, '_doc')),
                        mongoReqId: this.mongoReqId,
                        preQueryRes: mongoObjToJson(mongoRes.mongoDocs)
                    });
                } else {
                    this.originalConditions = mongoObjToJson(this._conditions);
                }
            } catch (e) {
                console.error(_.pick(this, ['op', '_conditions', '_doc']), e);
            }
        });

        schema.post(methods, async function(...args) {
            let doc = args[0];
            let next = args[1];
            if (this.asyncStore === undefined ||
                this instanceof mongoose.Types.Embedded) return next ? next() : null;
            try {
                global.asyncLocalStorage.enterWith(this.asyncStore);
                logWithStoreId('mongo post');
                var mongoRes = await getMongoDocs(this);

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
                    let request = pythagora.requests[pythagora.getRequestKeyByAsyncStore()];
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
            } catch (e) {
                console.error(e);
            }
            if (next) next();
        });
    });
}

async function cleanupDb() {
    const collections = await mongoose.connection.db.collections();
    for (const collection of collections) {
        await collection.drop();
    }
}

module.exports = {
    configureMongoosePlugin,
    cleanupDb
}
