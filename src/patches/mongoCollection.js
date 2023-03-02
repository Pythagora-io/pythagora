// TODO make a function that dynamically searches for the collection file
const originalCollection = require('../../../../mongodb/lib/collection');
const pythagoraErrors = require('../const/errors');
const MONGO_METHODS = require('../const/mongodb');
const {v4} = require('uuid');
const {
    getCurrentMongoDocs,
    extractArguments,
    checkForErrors,
    createCaptureIntermediateData,
    mongoObjToJson,
    findAndCheckCapturedData
} = require('../helpers/mongodb');
const MODES = require("../const/modes.json");
let ignoredMethods = [
    'rename',
    'drop',
    'isCapped',
    'createIndex',
    'createIndexes',
    'dropIndex',
    'dropIndexes',
    'reIndex',
    'listIndexes',
    'indexExists',
    'indexInformation',
    'estimatedDocumentCount',
    'distinct',
    'indexes',
    'stats',
    'watch',
    'geoHaystackSearch',
    'mapReduce',
    'initializeUnorderedBulkOp',
    'initializeOrderedBulkOp',
    'getLogger',
    'ensureIndex',
    'findAndModify',
    'parallelCollectionScan',
    'group'
];

Object.keys(MONGO_METHODS).forEach(method => {
    const originalMethod = originalCollection.prototype[method];
    originalCollection.prototype[method] = function () {
        let asyncContextId = global.asyncLocalStorage.getStore(),
            request = global.Pythagora.mode === MODES.capture ? global.Pythagora.getRequestByAsyncStore() :
                global.Pythagora.mode === MODES.test ? global.Pythagora.getTestingRequestByAsyncStore() : undefined,
            intermediateData = {},
            db = this.s.namespace.db,
            collectionName = this.s.namespace.collection;

        checkForErrors(method, request);

        // TODO weird situation where I can't get cursor from within if statement
        if (asyncContextId === undefined || !request || request.error) return originalMethod.apply(this, arguments);

        let callbackArgumentIndex = MONGO_METHODS[method].args.indexOf('callback');
        const { query, options, callback, otherArgs } = extractArguments(method, arguments);

        const preHook = async () => {
            if (global.Pythagora.mode === MODES.capture) {
                let preQueryRes = await getCurrentMongoDocs(this, query);
                intermediateData = createCaptureIntermediateData(db, collectionName, method, query, options, otherArgs, preQueryRes);
            }
        }

        const postHook = async (err, cursor) => {

            if (err) {
                // TODO handle Mongo errors
                throw new Error(err);
            }

            let mongoResult = cursor && cursor.toArray ? await cursor.toArray() : cursor;
            let postQueryRes = await getCurrentMongoDocs(this, query);
            if (global.Pythagora.mode === MODES.capture) {
                request.mongoQueriesCapture++;
                intermediateData.mongoRes = mongoObjToJson(mongoResult);
                intermediateData.postQueryRes = mongoObjToJson(postQueryRes);
                request.intermediateData.push(intermediateData);
            } else if (global.Pythagora.mode === MODES.test) {
                request.mongoQueriesTest++;
                findAndCheckCapturedData(
                    collectionName, method, mongoObjToJson(query), mongoObjToJson(options), mongoObjToJson(otherArgs),
                    request, mongoResult, postQueryRes
                );
            }

            if (typeof callback === 'function') {
                global.asyncLocalStorage.run(asyncContextId, () => callback(err, cursor));
                return;
            }

            if (err) reject(err);

            return cursor;
        };

        const cursorNextWrapper = (originalNext) => {
            return async function () {
                await preHook();
                let originalCallback = arguments[0];
                arguments[0] = async (err, item) => {
                    // TODO handle Mongo errors
                    if (err) {
                        console.log(err);
                    }
                    await postHook(null, item);
                    originalCallback(err, item);
                };
                originalNext.apply(this, arguments);
            }
        }

        const cursorMapWrapper = async (originalMap) => {

        }

        const toArrayWrapper = async (originalToArray) => {

        }

        const cursorSizeWrapper = async (originalSize) => {

        }

        const cursorSortWrapper = async (originalSort) => {

        }

        const cursorTryNextWrapper = async (originalTryNext) => {

        }

        if (typeof callback === 'function') {
            arguments[callbackArgumentIndex] = postHook;
            preHook().then(() => originalMethod.apply(this, arguments));
            return;
        }

        let cursor = originalMethod.apply(this, arguments);
        if (cursor && cursor.next) cursor.next = cursorNextWrapper(cursor.next);
        return cursor;

    }
});



module.exports = originalCollection;
