function convertOldTestForGPT(test) {
    delete test.url;
    delete test.trace;
    delete test.traceId;
    delete test.asyncStore;
    delete test.traceLegacy;
    delete test.createdAt;
    delete test.params;

    test.testId = test.id;
    delete test.id;

    test.response = JSON.parse(test.responseData);
    delete test.responseData;

    test.mongoQueryNum = test.mongoQueriesCapture;
    delete test.mongoQueriesCapture;

    test.reqQuery = test.query;
    delete test.query;

    test.reqBody = test.body;
    delete test.body;

    test.mongoQueries = test.intermediateData.map((item) => {
        item.preQueryDocs = item.preQueryRes;
        delete item.preQueryRes;

        item.postQueryDocs = item.postQueryRes;
        delete item.postQueryRes;

        item.mongoResponse = item.mongoRes;
        delete item.mongoRes;

        item.mongoQuery = item.query;
        delete item.query;

        item.mongoOptions = item.options;
        delete item.options;

        item.mongoOperation = item.op;
        delete item.op;

        return item;
    });
    delete test.intermediateData;

    return test;
}

module.exports = {
    convertOldTestForGPT
}

