const setUpWsMiddlewares = require('../helpers/wsMiddlewares.js')

module.exports = function (wsPath) {
    const originalWS = require(wsPath);

    const originalWsFunction = originalWS.function;

    // todo websockets
    // todo patch all needed functions to intercept websocket messages and inject setUpWsMiddlewares
    // setUpWsMiddlewares is already required at the top of file

    return originalWS;
}
