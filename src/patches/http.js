const { exportTest } = require('../commands/export');
const MODES = require('../const/modes.json');
const args = require("../utils/argumentsCheck");
const {run} = require("../commands/jest");
const {runPythagoraTests} = require("../RunPythagoraTests");

module.exports = function (httpModule) {
    let args = require('../utils/argumentsCheck.js');

    const originalHttp = require(httpModule);
    const Pythagora = require("../Pythagora");

    const originalCreateServer = originalHttp.createServer;
    originalHttp.createServer = function (app) {
        global.Pythagora = new Pythagora(args);
        global.Pythagora.setMongoClient(global.pythagoraMongoClient);
        global.Pythagora.runRedisInterceptor().then(() => {
            global.Pythagora.runWhenServerReady(async () => {
                switch (args.mode) {
                    case 'test':
                        runPythagoraTests();
                        break;
                    case 'jest':
                        const { run } = require('../commands/jest');
                        run();
                        break;
                    case 'export':
                        global.Pythagora.mode = MODES.test;
                        await runPythagoraTests(args.test_id);
                        global.Pythagora.mode = MODES.export;
                        exportTest(args.test_id);
                        break;
                }
            });
        });

        if (app) app.isPythagoraExpressInstance = true;
        let server = originalCreateServer.apply(this, arguments);

        const originalServerOnRequest = server.on;
        server.on = function (event, callback) {
            // TODO be aware that this can be called along with express.listen and http.createServer
            if (event === 'request' && typeof callback === 'function') callback.isPythagoraExpressInstance = true;
            return originalServerOnRequest.apply(this, arguments);
        }

        return server;
    }


    return originalHttp;
}
