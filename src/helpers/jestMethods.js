const { cleanupDb, jsonObjToMongo } = require("./mongodb");
const {PYTHAGORA_JEST_DB} = require("../const/mongodb");
const {EXPORTED_TESTS_DATA_DIR} = require("../const/common");

// TODO can we merge this with the other prepareDB?

async function prepareDB(mongoQueries) {
    let uniqueIds = [];
    for (const data of mongoQueries) {
        if (data.type !== 'mongodb') continue;
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

async function setUpDb(testId) {
    await cleanupDb(global.Pythagora);
    // TODO organize better by test groups
    let data = require(`../../../../${EXPORTED_TESTS_DATA_DIR}/${testId}.json`);
    await prepareDB(data);
    console.log(`MongoDB prepared for test ${testId}`);
    return jsonObjToMongo(data[0].mongoResponse);
}

async function cleanUpDb() {

    // TODO clean up collections

    await global.Pythagora.mongoClient.db(PYTHAGORA_JEST_DB).dropDatabase();
}

function getMongoCollection(collection) {
    return global.Pythagora.mongoClient.db(PYTHAGORA_JEST_DB).collection(collection);
}

module.exports = {
    setUpDb,
    cleanUpDb,
    getMongoCollection
};
