const pythagoraErrors = require("../const/errors");
const {
    compareJson,
    convertToRegularObject,
    ObjectId,
    objectIdAsStringRegex,
    dateAsStringRegex,
    stringToDate,
    regExpRegex,
    mongoIdRegex,
    stringToRegExp,
    isJSONObject,
    isObjectId
} = require("../utils/common.js");

const {v4} = require("uuid");
const _ = require("lodash");
const { MONGO_METHODS, PYTHAGORA_DB } = require("../const/mongodb");
const { PYTHAGORA_ASYNC_STORE } = require('@pythagora.io/js-code-processing').common;

let unsupportedMethods = ['aggregate'];

// todo remove this methods?
// let methods = ['save','find', 'insert', 'update', 'delete', 'deleteOne', 'insertOne', 'updateOne', 'updateMany', 'deleteMany', 'replaceOne', 'replaceOne', 'remove', 'findOneAndUpdate', 'findOneAndReplace', 'findOneAndRemove', 'findOneAndDelete', 'findByIdAndUpdate', 'findByIdAndRemove', 'findByIdAndDelete', 'exists', 'estimatedDocumentCount', 'distinct', 'translateAliases', '$where', 'watch', 'validate', 'startSession', 'diffIndexes', 'syncIndexes', 'populate', 'listIndexes', 'insertMany', 'hydrate', 'findOne', 'findById', 'ensureIndexes', 'createIndexes', 'createCollection', 'create', 'countDocuments', 'count', 'bulkWrite', 'aggregate'];

function mongoObjToJson(originalObj) {
    let obj = _.clone(originalObj);
    if (!obj) return obj;
    else if (isObjectId(obj)) return `ObjectId("${obj.toString()}")`;
    if (Array.isArray(obj)) return obj.map(d => {
        return mongoObjToJson(d)
    });
    obj = convertToRegularObject(obj);

    for (let key in obj) {
        if (!obj[key]) continue;
        if (isObjectId(obj[key])) {
            // TODO label a key as ObjectId better (not through a string)
            obj[key] = `ObjectId("${obj[key].toString()}")`;
        } else if (obj[key] instanceof Date) {
            // TODO label a key as Date better (not through a string)
            obj[key] = `Date("${obj[key].toISOString()}")`;
        } else if (obj[key] instanceof RegExp) {
            obj[key] = `RegExp("${obj[key].toString()}")`;
        } else if (typeof obj[key] === 'object') {
            obj[key] = mongoObjToJson(obj[key]);
        }
    }
    return obj;
}

function jsonObjToMongo(originalObj) {
    let obj = _.clone(originalObj);
    if (!obj) return obj;
    if (Array.isArray(obj)) return obj.map(d => jsonObjToMongo(d));
    else if (typeof obj === 'string' && objectIdAsStringRegex.test(obj)) return stringToMongoObjectId(obj);
    else if (typeof obj === 'string' && mongoIdRegex.test(obj)) return stringToMongoObjectId(`ObjectId("${obj}")`);
    else if (typeof obj === 'string' && dateAsStringRegex.test(obj)) return stringToDate(obj);
    else if (typeof obj === 'string' && regExpRegex.test(obj)) return stringToRegExp(obj);
    else if (isJSONObject(obj)) {
        obj = convertToRegularObject(obj);
        for (let key in obj) {
            if (!obj[key]) continue;
            else if (typeof obj[key] === 'string') {
                // TODO label a key as ObjectId better (not through a string)
                if (objectIdAsStringRegex.test(obj[key])) obj[key] = stringToMongoObjectId(obj[key]);
                else if (mongoIdRegex.test(obj[key])) obj[key] = stringToMongoObjectId(`ObjectId("${obj[key]}")`);
                else if (dateAsStringRegex.test(obj[key])) obj[key] = stringToDate(obj[key]);
                else if (regExpRegex.test(obj[key])) obj[key] = stringToRegExp(obj[key]);
            } else if (obj[key]._bsontype === "ObjectID") {
                continue;
            } else if (isJSONObject(obj[key]) || Array.isArray(obj[key])) {
                obj[key] = jsonObjToMongo(obj[key]);
            }
        }
    }
    return obj;
}

function stringToMongoObjectId(str) {
    let idValue = str.match(objectIdAsStringRegex);
    if (idValue && idValue[1] && ObjectId.isValid(idValue[1])) {
        return new ObjectId(idValue[1]);
    }
    return str;
}

// usually, we won't pass any options because we want to get whole documents
async function getCurrentMongoDocs(collection, query, options = {}) {
    return await new Promise((resolve, reject) => {
        global.asyncLocalStorage.run(PYTHAGORA_ASYNC_STORE, async () => {
            if (Array.isArray(query)) {
                let results = query.map(async q => {
                    let qRes = await collection.find(q.query, options);
                    return await qRes.toArray();
                });
                resolve(_.flatten(await Promise.all(results)));
            } else {
                let result = await collection.find(query, options);
                resolve(await result.toArray());
            }
        });
    });
}


function extractArguments(method, args) {
    let returnObj = {
        otherArgs: {}
    };
    // TODO add processing for .multi
    let neededArgs = Object.keys(MONGO_METHODS[method]).slice(1);
    for (let i = 0; i < MONGO_METHODS[method].args.length; i++) {
        let mappedArg = neededArgs.find(d => MONGO_METHODS[method][d].argName === MONGO_METHODS[method].args[i]);
        if (mappedArg) {

            if (MONGO_METHODS[method][mappedArg].multi) {
                let operations = args[i];
                returnObj[mappedArg] = operations.map(d => {
                    let op = Object.keys(d)[0];
                    let opNeededArgs = Object.keys(MONGO_METHODS[op]).slice(1);
                    delete opNeededArgs.args;
                    let opArgs = {
                        subOp: op,
                        otherArgs: {}
                    };
                    _.forEach(d[op], (v, k) =>  {
                        let mappedValue = opNeededArgs.find(ona => MONGO_METHODS[op][ona].argName === k);
                        if (mappedValue) opArgs[mappedValue] = v;
                        else opArgs.otherArgs[k] = v;
                    })
                    return opArgs;
                });
            } else {
                let ignoreKeys = MONGO_METHODS[method][mappedArg].ignore;
                let mappsedArgData = args[i];
                if (ignoreKeys) mappsedArgData = _.omit(mappsedArgData, ignoreKeys);
                returnObj[mappedArg] = mappsedArgData;
            }
        } else {
            returnObj.otherArgs[MONGO_METHODS[method].args[i]] = args[i];
        }
    }

    return returnObj;
}

function checkForErrors(method, request) {
    if (unsupportedMethods.includes(method) && request) {
        request.error = pythagoraErrors.mongoMethodNotSupported(method);
    }
}

async function clearAllCollections(db) {
    if (db.databaseName !== PYTHAGORA_DB) return;
    const collections = await db.listCollections().toArray();
    const regularCollections = collections.filter(collection => !collection.name.startsWith("system.") && !collection.name.startsWith("_"));
    for (const collection of regularCollections) {
        await db.collection(collection.name).deleteMany({});
    }
}

async function cleanupDb(pythagora) {
    const dbConnection = pythagora.mongoClient.db(PYTHAGORA_DB);
    await clearAllCollections(dbConnection);
}

function createCaptureIntermediateData(db, collection, op, query, options, otherArgs, preQueryRes) {
    return {
        type: 'mongodb',
        id: v4(), // former mongoReqId
        preQueryRes: mongoObjToJson(preQueryRes),
        query: mongoObjToJson(query), // former 'res'
        otherArgs: mongoObjToJson(otherArgs),
        options: mongoObjToJson(options),
        op,
        db,
        collection
    };
}

function findAndCheckCapturedData(collection, op, query, options, otherArgs, request, mongoResult, postQueryRes) {
    let capturedData = request.intermediateData.find(d => {
        return !d.processed &&
            d.type === 'mongodb' &&
            d.collection === collection &&
            d.op === op &&
            compareJson(d.query, query, true) &&
            compareJson(d.options, options, true) &&
            compareJson(d.otherArgs, otherArgs, true);
    });

    if (capturedData) capturedData.processed = true;
    if (capturedData && (
        !compareJson(capturedData.mongoRes, mongoObjToJson(mongoResult)) ||
        !compareJson(capturedData.postQueryRes, mongoObjToJson(postQueryRes))
    )) {
        request.errors.push({
            type: 'mongoResultDifferent',
            collection,
            op,
            query,
            options,
            otherArgs,
            test: {
                mongoResult: mongoObjToJson(mongoResult),
                postQueryRes: mongoObjToJson(postQueryRes)
            },
            capture: {
                mongoResult: capturedData.mongoRes,
                postQueryRes: capturedData.postQueryRes
            }
        });
    } else if (!capturedData) {
        request.errors.push({
            type: 'mongoQueryNotFound',
            collection,
            op,
            query,
            options
        });
    }
}

async function prepareDB(pythagora, req) {
    await cleanupDb(pythagora);

    const testReq = await pythagora.getRequestMockDataById(req);
    if (!testReq) return;

    let uniqueIds = [];
    for (const data of testReq.intermediateData) {
        if (data.type !== 'mongodb') continue;
        let insertData = [];
        for (let doc of data.preQueryRes) {
            if (!uniqueIds.includes(doc._id)) {
                uniqueIds.push(doc._id);
                insertData.push(jsonObjToMongo(doc));
            }
        }
        if (insertData.length) await pythagora.mongoClient.db(PYTHAGORA_DB).collection(data.collection).insertMany(insertData);
    }
}

function extractDataFromMongoRes(mongoResult) {
    // todo refactor to add path to mongoResult inside src/const/mongodb.js for each method
    if (mongoResult &&
        mongoResult.result &&
        mongoResult.__proto__ &&
        mongoResult.__proto__.constructor &&
        mongoResult.__proto__.constructor.name === 'CommandResult')
        mongoResult = _.omit(mongoResult.result, ['electionId', 'opTime', '$clusterTime', 'operationTime']);
    // todo refactor to add path to mongoResult inside src/const/mongodb.js for each method
    if (mongoResult &&
        mongoResult.value &&
        mongoResult.lastErrorObject &&
        mongoResult.ok &&
        mongoResult.__proto__ &&
        mongoResult.__proto__.constructor &&
        mongoResult.__proto__.constructor.name === 'Object')
        mongoResult = mongoResult.value;

    return mongoResult
}

module.exports = {
    checkForErrors,
    cleanupDb,
    createCaptureIntermediateData,
    extractArguments,
    extractDataFromMongoRes,
    findAndCheckCapturedData,
    getCurrentMongoDocs,
    jsonObjToMongo,
    mongoObjToJson,
    prepareDB,
}
