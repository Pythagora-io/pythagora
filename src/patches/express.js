const originalExpress = require('express');
const { setUpExpressMiddlewares } = require('../helpers/middlewares');

pythagoraExpress = function () {
    const app = originalExpress.apply(this, arguments);
    const originalListen = app.listen;
    app.listen = function () {
        app.isPythagoraExpressInstance = true;
        return originalListen.apply(this, arguments);
    }

    setUpExpressMiddlewares(app);
    return app;
}

Object.assign(pythagoraExpress, originalExpress);
module.exports = pythagoraExpress;
