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
    postHook
} = require('../helpers/mongodb');
const MODES = require("@pythagora.io/pythagora/src/const/modes.json");
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
    originalCollection.prototype[method] = async function () {
        let asyncContextId = global.asyncLocalStorage.getStore(),
            request = global.Pythagora.mode === MODES.capture ? global.Pythagora.getRequestByAsyncStore() :
                global.Pythagora.mode === MODES.test ? global.Pythagora.getTestingRequestByAsyncStore() : undefined,
            intermediatedata = {},
            db = this.s.namespace.db,
            collectionName = this.s.namespace.collection;

        checkForErrors(method, request);

        if (asyncContextId !== undefined && request && !request.error) {
            let callbackArgumentIndex = MONGO_METHODS[method].indexOf('callback');
            const { query, options, callback } = extractArguments(method, arguments);

            // preHook
            if (global.Pythagora.mode === MODES.capture) {
                let preQueryRes = await getCurrentMongoDocs(this, query, options);
                intermediatedata = createCaptureIntermediateData(db, collectionName, query, options, preQueryRes);
            } else if (global.Pythagora.mode === MODES.test) {
                // this.originalConditions = mongoObjToJson(this._conditions);
            }
            // end preHook

            arguments[callbackArgumentIndex] = async (err, cursor) => {
                if (err) {
                    // TODO handle Mongo errors
                }
                // TODO probati ovo maknuti
                await new Promise((resolve, reject) => {
                    global.asyncLocalStorage.run(asyncContextId, async () => {
                        await postHook(this, cursor, query, options, db, collectionName, request, intermediatedata);
                        resolve();
                    });
                });

                console.log('\x1b[32m\x1b[1m', `${asyncContextId} Mongo [ ${method} ]`, `${!!cursor}\x1b[0m`);
                if (typeof callback === 'function') {
                    global.asyncLocalStorage.run(asyncContextId, () => callback(err, cursor));
                    return;
                }

                return cursor;
            };
        }

        return originalMethod.apply(this, arguments);
    }
});



module.exports = originalCollection;
