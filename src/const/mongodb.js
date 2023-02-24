module.exports = {
    'insertOne': [
        'doc',
        'options',
        'callback'
    ],
    'insertMany': [
        'docs',
        'options',
        'callback'
    ],
    'bulkWrite': [
        'operations',
        'options',
        'callback'
    ],
    'updateOne': [
        'filter',
        'update',
        'options',
        'callback'
    ],
    'replaceOne': [
        'filter',
        'doc',
        'options',
        'callback'
    ],
    'updateMany': [
        'filter',
        'update',
        'options',
        'callback'
    ],
    'deleteOne': [
        'filter',
        'options',
        'callback'
    ],
    'deleteMany': [
        'filter',
        'options',
        'callback'
    ],
    // 'rename': [
    //     'newName',
    //     'options',
    //     'callback'
    // ],
    // 'drop': [
    //     'options',
    //     'callback'
    // ],
    'options': [
        'opts',
        'callback'
    ],
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
    'countDocuments': [
        'query',
        'options',
        'callback'
    ],
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
    'findOneAndDelete': [
        'filter',
        'options',
        'callback'
    ],
    'findOneAndReplace': [
        'filter',
        'replacement',
        'options',
        'callback'
    ],
    'findOneAndUpdate': [
        'filter',
        'update',
        'options',
        'callback'
    ],
    'aggregate': [
        'pipeline',
        'options',
        'callback'
    ],
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
    'insert': [
        'docs',
        'options',
        'callback'
    ],
    'update': [
        'selector',
        'update',
        'options',
        'callback'
    ],
    'remove': [
        'selector',
        'options',
        'callback'
    ],
    'save': [
        'doc',
        'options',
        'callback'
    ],
    // 'ensureIndex': [
    //     'fieldOrSpec',
    //     'options',
    //     'callback'
    // ],
    'count': [
        'query',
        'options',
        'callback'
    ],
    'find': [
        'query',
        'options',
        'callback'
    ],
    'findOne': [
        'query',
        'options',
        'callback'
    ],
    // 'findAndModify': [
    //     '_findAndModify',
    //     ''collection.findAndModify is deprecated. Use findOneAndUpdate',
    //     'findOneAndReplace or findOneAndDelete instead.''
    // ],
    'findAndRemove': [
        'query',
        'sort',
        'options',
        'callback'
    ],
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
