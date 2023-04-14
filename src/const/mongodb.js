const unsupportedMethods = {
    // 'rename': [
    //     'newName',
    //     'options',
    //     'callback'
    // ],
    // 'drop': [
    //     'options',
    //     'callback'
    // ],
    // 'isCapped': [
    //     'options',
    //     'callback'
    // ],
    // 'createIndex': [
    //     'fieldOrSpec',
    //     'options',
    //     'callback'
    // ],
    // 'createIndexes': [
    //     'indexSpecs',
    //     'options',
    //     'callback'
    // ],
    // 'dropIndex': [
    //     'indexName',
    //     'options',
    //     'callback'
    // ],
    // 'dropIndexes': [
    //     'options',
    //     'callback'
    // ],
    // 'reIndex': [
    //     'options',
    //     'callback'
    // ],
    // 'listIndexes': [
    //     'options'
    // ],
    // 'indexExists': [
    //     'indexes',
    //     'options',
    //     'callback'
    // ],
    // 'indexInformation': [
    //     'options',
    //     'callback'
    // ],
    // 'estimatedDocumentCount': [
    //     'options',
    //     'callback'
    // ],
    // 'distinct': [
    //     'key',
    //     'query',
    //     'options',
    //     'callback'
    // ],
    // 'indexes': [
    //     'options',
    //     'callback'
    // ],
    // 'stats': [
    //     'options',
    //     'callback'
    // ],
    // 'watch': [
    //     'pipeline',
    //     'options'
    // ],
    // 'geoHaystackSearch': [
    //     'x',
    //     'y',
    //     'options',
    //     'callback'
    // ],
    // 'mapReduce': [
    //     'map',
    //     'reduce',
    //     'options',
    //     'callback'
    // ],
    // 'initializeUnorderedBulkOp': [
    //     'options'
    // ],
    // 'initializeOrderedBulkOp': [
    //     'options'
    // ],
    // 'getLogger': []
    // 'ensureIndex': [
    //     'fieldOrSpec',
    //     'options',
    //     'callback'
    // ],
    // 'findAndModify': [
    //     '_findAndModify',
    //     ''collection.findAndModify is deprecated. Use findOneAndUpdate',
    //     'findOneAndReplace or findOneAndDelete instead.''
    // ],
    // 'parallelCollectionScan': [
    //     'options',
    //     'callback'
    // ],
    // 'group': [
    //     'keys',
    //     'condition',
    //     'initial',
    //     'reduce',
    //     'finalize',
    //     'command',
    //     'options',
    //     'callback'
    // ]
}

const MONGO_METHODS = {
    'insertOne': {
        args: [
            'doc',
            'options',
            'callback'
        ],
        query: { argName: 'doc', multi: false },
        callback: { argName: 'callback' },
        options: { argName: 'options', ignore: ['session'] }
    },
    'insertMany': {
        args: [
            'docs',
            'options',
            'callback'
        ],
        query: { argName: 'docs', multi: true },
        callback: { argName: 'callback' },
        options: { argName: 'options', ignore: ['session'] }
    },
    'bulkWrite': {
        args: [
            'operations',
            'options',
            'callback'
        ],
        query: { argName: 'operations', multi: true },
        callback: { argName: 'callback' },
        options: { argName: 'options', ignore: ['session'] }
    },
    'updateOne': {
        args: [
            'filter',
            'update',
            'options',
            'callback'
        ],
        query: { argName: 'filter', multi: false },
        callback: { argName: 'callback' },
        options: { argName: 'options', ignore: ['session'] }
    },
    'replaceOne': {
        args: [
            'filter',
            'doc',
            'options',
            'callback'
        ],
        query: { argName: 'filter', multi: false },
        callback: { argName: 'callback' },
        options: { argName: 'options', ignore: ['session'] }
    },
    'updateMany': {
        args: [
            'filter',
            'update',
            'options',
            'callback'
        ],
        query: { argName: 'filter', multi: false },
        callback: { argName: 'callback' },
        options: { argName: 'options', ignore: ['session'] }
    },
    'deleteOne': {
        args: [
            'filter',
            'options',
            'callback'
        ],
        query: { argName: 'filter', multi: false },
        callback: { argName: 'callback' },
        options: { argName: 'options', ignore: ['session'] }
    },
    'deleteMany': {
        args: [
            'filter',
            'options',
            'callback'
        ],
        query: { argName: 'filter', multi: false },
        callback: { argName: 'callback' },
        options: { argName: 'options', ignore: ['session'] }
    },
    'options': {
        args: [
            'opts',
            'callback'
        ],
        query: { argName: 'opts', multi: false },
        callback: { argName: 'callback' },
        options: { argName: 'opts' }
    },
    'countDocuments': {
        args: [
            'query',
            'options',
            'callback'
        ],
        query: { argName: 'query', multi: false },
        callback: { argName: 'callback' },
        options: { argName: 'options', ignore: ['session'] }
    },
    'findOneAndDelete': {
        args: [
            'filter',
            'options',
            'callback'
        ],
        query: { argName: 'filter', multi: false },
        callback: { argName: 'callback' },
        options: { argName: 'options', ignore: ['session'] }
    },
    'findOneAndReplace': {
        args: [
            'filter',
            'replacement',
            'options',
            'callback'
        ],
        query: { argName: 'filter', multi: false },
        callback: { argName: 'callback' },
        options: { argName: 'options', ignore: ['session'] }
    },
    'findOneAndUpdate': {
        args: [
            'filter',
            'update',
            'options',
            'callback'
        ],
        query: { argName: 'filter', multi: false },
        callback: { argName: 'callback' },
        options: { argName: 'options', ignore: ['session'] }
    },
    'aggregate': {
        args: [
            'pipeline',
            'options',
            'callback'
        ],
        query: {
            argName: 'pipeline',
            multi: false,
            conversionFunction: (pipeline) => {
                // TODO create an array of queries from the aggregate pipeline
                // each query will be sent to the database to get all documents that will be used in the aggregate pipeline
                /**
                 * Example:
                 * [
                 *    {
                 *        subOp: 'find', // or 'update' in the case of $out and $merge
                 *        otherArgs: {} // empty if subOp is 'find' - if subOp is 'update' then it will contain the update object
                 *        query: {} // the query object
                 *    },
                 * ]
                 */
            }
        },
        callback: { argName: 'callback' },
        options: { argName: 'options', ignore: ['session'] }
    },
    'insert': {
        args: [
            'docs',
            'options',
            'callback'
        ],
        query: { argName: 'docs', multi: true },
        callback: { argName: 'callback' },
        options: { argName: 'options', ignore: ['session'] }
    },
    'update': {
        args: [
            'selector',
            'update',
            'options',
            'callback'
        ],
        query: { argName: 'selector', multi: false },
        callback: { argName: 'callback' },
        options: { argName: 'options', ignore: ['session'] }
    },
    'remove': {
        args: [
            'selector',
            'options',
            'callback'
        ],
        query: { argName: 'selector', multi: false },
        callback: { argName: 'callback' },
        options: { argName: 'options', ignore: ['session'] }
    },
    'save': {
        args: [
            'doc',
            'options',
            'callback'
        ],
        query: { argName: 'doc', multi: false },
        callback: { argName: 'callback' },
        options: { argName: 'options', ignore: ['session'] }
    },
    'count': {
        args: [
            'query',
            'options',
            'callback'
        ],
        query: { argName: 'query', multi: false },
        callback: { argName: 'callback' },
        options: { argName: 'options', ignore: ['session'] }
    },
    'find': {
        args: [
            'query',
            'options',
            'callback'
        ],
        query: { argName: 'query', multi: false },
        callback: { argName: 'callback' },
        options: { argName: 'options', ignore: ['session'] }
    },
    'findOne': {
        args: [
            'query',
            'options',
            'callback'
        ],
        query: { argName: 'query', multi: false },
        callback: { argName: 'callback' },
        options: { argName: 'options', ignore: ['session'] }
    },
    'findAndRemove': {
        args: [
            'query',
            'sort',
            'options',
            'callback'
        ],
        query: { argName: 'query', multi: false },
        callback: { argName: 'callback' },
        options: { argName: 'options', ignore: ['session'] }
    }
};

const PYTHAGORA_DB = 'pythagoraDb';

module.exports = {
    MONGO_METHODS,
    PYTHAGORA_DB
}
