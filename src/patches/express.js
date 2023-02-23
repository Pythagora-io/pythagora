const originalExpress = require('express');

pythagoraExpress = function () {
    const app = originalExpress.apply(this, arguments);
    if (global.Pythagora) global.Pythagora.setApp(app);
    return app;
}

Object.assign(pythagoraExpress, originalExpress);
module.exports = pythagoraExpress;
