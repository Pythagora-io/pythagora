module.exports = function (httpModule) {
    let args = require('../utils/argumentsCheck.js');
    let { startPythagora } = require ('../helpers/starting.js');

    const originalHttp = require(httpModule);

    const originalServer = originalHttp.Server;
    originalHttp.Server = function (app) {
        startPythagora(args, app);
        return originalServer.apply(this, arguments);
    }

    const originalCreateServer = originalHttp.createServer;
    originalHttp.createServer = function (app) {
        startPythagora(args, app);
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
