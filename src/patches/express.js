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
    const originalUse = app.use;
    app.listen = function () {
        global.Pythagora.expressInstances.filter(e => e !== this).forEach(removePythagoraMiddlewares);
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
    if (global.Pythagora) global.Pythagora.setApp(app);
    return app;
}

Object.assign(pythagoraExpress, originalExpress);
module.exports = pythagoraExpress;
