const originalExpress = require('express');
const { setUpExpressMiddlewares } = require('../helpers/middlewares');

pythagoraExpress = function () {
    const app = originalExpress.apply(this, arguments);
    setUpExpressMiddlewares(app);
    return app;
}

Object.assign(pythagoraExpress, originalExpress);
module.exports = pythagoraExpress;
