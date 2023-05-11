const MODES = require("../const/modes.json");
const { PYTHAGORA_TESTS_DIR, PYTHAGORA_WEBSOCKETS_DIR } = require("../const/common.js");
const {prepareDB} = require("./mongodb");
const {v4} = require("uuid");
const {executionAsyncId} = require("node:async_hooks");
const bodyParser = require("body-parser");
const fs = require("fs");
const {logWithStoreId} = require("../utils/cmdPrint");

function setUpWsMiddlewares(app) {
    // todo websockets

    const pythagoraWsMiddlwares = {
        ignoreWsMiddleware: () => {
            // not necessary
            // todo ignore irrelevant socket messages
        },

        prepareTestingWsMiddleware: () => {
            // not necessary
            // todo prepare DB and any other services
        },

        setUpPythagoraDataWsMiddleware: () => {
            // todo store all data needed to track websockets
        },

        setUpInterceptorWsMiddleware: async () => {
            // todo setup capture and test interceptors for websockets
            if (global.Pythagora.mode === MODES.capture) await wsCaptureInterceptor();
            else if (global.Pythagora.mode === MODES.test) await wsTestInterceptor();
        }

    };

    // todo set all middlewares from above. Here is example how it was done for express middlewares:

    // app.use(pythagoraMiddlewares.ignoreMiddleware);
}

async function wsCaptureInterceptor() {
    global.asyncLocalStorage.run(global.Pythagora.idSeq++, () => {
        // todo store data captured from sockets
        // fs.writeFileSync(`./${PYTHAGORA_TESTS_DIR}/${PYTHAGORA_WEBSOCKETS_DIR}/${filename}`, JSON.stringify(testData));
        // todo continue execution similar to next() in express routes
    });
}

async function wsTestInterceptor() {
    // todo get data stored while capturing and compare to test data
}

module.exports = {
    setUpWsMiddlewares
}
