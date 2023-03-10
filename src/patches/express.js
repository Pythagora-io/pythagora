const originalExpress = require('express');
const { setUpExpressMiddlewares } = require('../helpers/middlewares');

pythagoraExpress = function () {
    const app = originalExpress.apply(this, arguments);
    const originalListen = app.listen;
    const originalUse = app.use;
    app.listen = function () {
        app.isPythagoraExpressInstance = true;
        return originalListen.apply(this, arguments);
    }
    app.use = function() {
        if (!global.Pythagora.authenticationMiddleware) return originalUse.apply(this, arguments);

        let originalMiddleware = arguments[0];
        arguments[0] = async function() {
            global.Pythagora.authenticationInProcess = true;
            let res = await originalMiddleware.apply(this, arguments);
            global.Pythagora.authenticationInProcess = false;
            return res;
        };

        global.Pythagora.authenticationMiddleware = false;
        return originalUse.apply(this, arguments);
    }
    setUpExpressMiddlewares(app);
    return app;
}

Object.assign(pythagoraExpress, originalExpress);
module.exports = pythagoraExpress;
