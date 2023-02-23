// TODO make a function that dynamically searches for the collection file
const originalCollection = require('../../mongodb/lib/collection');
const { preHook, postHook } = require('../helpers/mongo.js');
let methods = ['save','find', 'insert', 'update', 'delete', 'deleteOne', 'insertOne', 'updateOne', 'updateMany', 'deleteMany', 'replaceOne', 'replaceOne', 'remove', 'findOneAndUpdate', 'findOneAndReplace', 'findOneAndRemove', 'findOneAndDelete', 'findByIdAndUpdate', 'findByIdAndRemove', 'findByIdAndDelete', 'exists', 'estimatedDocumentCount', 'distinct', 'translateAliases', '$where', 'watch', 'validate', 'startSession', 'diffIndexes', 'syncIndexes', 'populate', 'listIndexes', 'insertMany', 'hydrate', 'findOne', 'findById', 'ensureIndexes', 'createIndexes', 'createCollection', 'create', 'countDocuments', 'count', 'bulkWrite', 'aggregate'];

methods.forEach(method => {
    const originalMethod = originalCollection.prototype[method];
    originalCollection.prototype[method] = async function () {
        const asyncContextId = global.asyncLocalStorage.getStore();
        if (asyncContextId !== undefined) {
            let callbackArgumentIndex = getCallbackArgumentIndex(originalMethod.toString());
            const originalCallback = arguments[callbackArgumentIndex];

            // TODO: call preHook
            arguments[callbackArgumentIndex] = async (err, cursor) => {
                // TODO: call postHook
                console.log('\x1b[32m\x1b[1m', `${asyncContextId} Mongo [ ${method} ]`, `${!!cursor}\x1b[0m`);
                if (typeof originalCallback === 'function') {
                    originalCallback(err, cursor);
                    return;
                }

                if (err) reject(err);

                return cursor;
            };
        }

        return originalMethod.apply(this, arguments);
    }
});

function getCallbackArgumentIndex(methodFunction) {
    const argsRegex = /\(([^)]*)\)/;
    const argsMatch = argsRegex.exec(methodFunction);

    const argsList = argsMatch[1];

    const argsArray = argsList.split(',').map(arg => arg.trim());

    return argsArray.indexOf('callback');
}

module.exports = originalCollection;
