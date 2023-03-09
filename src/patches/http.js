module.exports = function (httpModule) {
    const originalHttp = require(httpModule);
    const Pythagora = require("../Pythagora");

    const originalCreateServer = originalHttp.createServer;
    originalHttp.createServer = function () {
        global.Pythagora = new Pythagora(process.env.PYTHAGORA_MODE);
        global.Pythagora.setMongoClient(global.pythagoraMongoClient);
        global.Pythagora.runRedisInterceptor().then(() => {
            if (process.env.PYTHAGORA_MODE === 'test') {
                require('../../RunPythagoraTests.js');
            }
        });
        // require(path.join(process.cwd(), initScript));
        return originalCreateServer.apply(this, arguments);
    }

    return originalHttp;
}
