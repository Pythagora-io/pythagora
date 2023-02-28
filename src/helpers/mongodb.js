const pythagoraErrors = require("../const/errors");
const MODES = require("../const/modes.json");
const { compareJson, jsonObjToMongo, noUndefined, convertToRegularObject } = require("../utils/common.js");
const { logWithStoreId } = require("../utils/cmdPrint.js");

const {v4} = require("uuid");
const _ = require("lodash");
const MONGO_METHODS = require("../const/mongodb");
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
    let returnObj = {
        otherArgs: {}
    };
    // TODO dodati processing za .multi
    let neededArgs = Object.keys(MONGO_METHODS[method]).slice(1);
    for (let i = 0; i < MONGO_METHODS[method].args.length; i++) {
        let mappedArg = neededArgs.find(d => MONGO_METHODS[method][d].argName === MONGO_METHODS[method].args[i]);
        if (mappedArg) {
            let ignoreKeys = MONGO_METHODS[method][mappedArg].ignore;
            let mappsedArgData = arguments[i];
            if (ignoreKeys) mappsedArgData = _.omit(mappsedArgData, ignoreKeys);
            returnObj[mappedArg] = mappsedArgData;
        } else {
            returnObj.otherArgs[MONGO_METHODS[method].args[i]] = arguments[i];
        }
    }

    return returnObj;
}

function checkForErrors(method, request) {
    if (unsupportedMethods.includes(method) && request) {
        request.error = pythagoraErrors.mongoMethodNotSupported(method);
    }
}

async function cleanupDb() {
    const collections = await mongoose.connection.db.collections();
    for (const collection of collections) {
        await collection.drop();
    }
}

function createCaptureIntermediateData(db, collection, op, query, options, otherArgs, preQueryRes) {
    return {
        type: 'mongodb',
        id: v4(), // former mongoReqId
        preQueryRes: mongoObjToJson(preQueryRes),
        query: mongoObjToJson(query), // former 'res'
        op,
        options,
        db,
        collection,
        otherArgs
    };
}

function findCapturedData(collectionName, op, query, options, otherArgs, intermediateData) {
    return intermediateData.find(d => {
        return !d.processed &&
            d.type === 'mongodb' &&
            d.collection === collectionName &&
            d.op === op &&
            compareJson(d.query, query, true) &&
            compareJson(d.options, options, true) &&
            compareJson(d.otherArgs, otherArgs, true);
    });
}

function checkCapturedData(capturedData, mongoResult, postQueryRes, request) {
    if (capturedData) capturedData.processed = true;
    if (capturedData && (
        !compareJson(capturedData.mongoRes, mongoObjToJson(mongoResult)) ||
        !compareJson(capturedData.postQueryRes, mongoObjToJson(postQueryRes))
    )) {
        request.errors.push(pythagoraErrors.mongoResultDifferent);
    } else if (!capturedData) {
        request.errors.push(pythagoraErrors.mongoQueryNotFound);
    }
}

async function postHook(collection, cursor, query, options, db, collectionName, request, intermediateData) {
    let mongoResult = cursor.toArray ? await cursor.toArray() : cursor;
    let postQueryRes = await getCurrentMongoDocs(collection, query, options);
    if (global.Pythagora.mode === MODES.capture) {
        request.mongoQueriesCapture++;
        intermediateData.mongoRes = mongoObjToJson(mongoResult);
        intermediateData.postQueryRes = mongoObjToJson(postQueryRes);
        request.intermediateData.push(_.clone(intermediateData));
    } else if (global.Pythagora.mode === MODES.test) {
        request.mongoQueriesTest++;
        let capturedData = findCapturedData(
            collectionName, mongoObjToJson(query), mongoObjToJson(options), request.intermediateData
        );
        checkCapturedData(capturedData, mongoResult, postQueryRes, request);
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

module.exports = {
    cleanupDb,
    preHook,
    findCapturedData,
    checkCapturedData,
    mongoObjToJson,
    getCurrentMongoDocs,
    extractArguments,
    checkForErrors,
    createCaptureIntermediateData
}
