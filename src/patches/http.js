let { exportTest } = require('../commands/export');
let { run: runExportedJestTests } = require('../commands/jest');

module.exports = function (httpModule) {
    let args = require('../utils/argumentsCheck.js');

    const originalHttp = require(httpModule);
    const Pythagora = require("../Pythagora");

    const originalCreateServer = originalHttp.createServer;
    originalHttp.createServer = function (app) {
        global.Pythagora = new Pythagora(args);
        global.Pythagora.setMongoClient(global.pythagoraMongoClient);
        global.Pythagora.runRedisInterceptor().then(() => {
            if (args.export) {
                global.Pythagora.runWhenServerReady(() => {
                    exportTest(args.test_id);
                });
            } else if (args.mode === 'jest') {
                global.Pythagora.runWhenServerReady(() => {
                    runExportedJestTests();
                });
            } else if (args.mode === 'test') {
                global.Pythagora.runWhenServerReady(() => {
                    require('../RunPythagoraTests.js');
                });
            }
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
