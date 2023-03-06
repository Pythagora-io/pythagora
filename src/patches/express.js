const originalExpress = require('express');

removePythagoraMiddlewares = function (express) {
    let indexesToRemove = express._router.stack.map(middleware => middleware.handle.isPythagoraMiddleware);
    for (let i = express._router.stack.length - 1; i >= 0; i--) {
        if (indexesToRemove[i]) {
            express._router.stack.splice(i, 1);
        }
    }
}

pythagoraExpress = function () {
    const app = originalExpress.apply(this, arguments);
    const originalListen = app.listen;
    app.listen = function () {
        global.Pythagora.expressInstances.filter(e => e !== this).forEach(removePythagoraMiddlewares);
        return originalListen.apply(this, arguments);
    }
    if (global.Pythagora) global.Pythagora.setApp(app);
    return app;
}

Object.assign(pythagoraExpress, originalExpress);
module.exports = pythagoraExpress;
