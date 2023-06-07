const { cleanupDb, jsonObjToMongo } = require("./mongodb");
const {PYTHAGORA_JEST_DB} = require("../const/mongodb");
const {EXPORTED_TESTS_DATA_DIR, SRC_TO_ROOT} = require("../const/common");
const _ = require('lodash');

// TODO can we merge this with the other prepareDB?

async function prepareDB(mongoQueries) {
    let uniqueIds = [];
    for (const data of mongoQueries) {
        if (data.type !== 'mongodb' || !data.preQueryDocs) continue;
        let insertData = [];
        for (let doc of data.preQueryDocs) {
            if (!uniqueIds.includes(doc._id)) {
                uniqueIds.push(doc._id);
                insertData.push(jsonObjToMongo(doc));
            }
        }
        if (insertData.length) await global.getMongoCollection(data.collection).insertMany(insertData);
    }
}

async function setUpDb(testName) {
    await cleanupDb(global.Pythagora);
    // TODO organize better by test groups
    let data = require(`../${SRC_TO_ROOT}${EXPORTED_TESTS_DATA_DIR}/${testName.replace('.test.js', '.json')}`);
    await prepareDB(data);
    console.log(`MongoDB prepared for test ${testName}`);
    let preparedData = _.groupBy(data, 'collection');
    preparedData = _.mapValues(preparedData, docs => {
        return docs.map(doc => doc.preQueryDocs).flat();
    });
    return jsonObjToMongo(preparedData);
}

async function cleanUpDb() {

    // TODO clean up collections

    await global.Pythagora.mongoClient.db(PYTHAGORA_JEST_DB).dropDatabase();
}

function getMongoCollection(collection) {
    return global.Pythagora.mongoClient.db(PYTHAGORA_JEST_DB).collection(collection);
}

module.exports = {
    cleanUpDb,
    getMongoCollection,
    setUpDb,
};
