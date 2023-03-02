const tryrequire = require('tryrequire');
const jwt = tryrequire("jsonwebtoken");
// const sinon = require("sinon");

function patchJwtVerify(clockTimestamp) {
    if (!jwt) return;
    clockTimestamp = clockTimestamp/1000;
    const originalFunction = jwt.verify;

    function myFunctionWithHooks() {
        let result;
        // let clock = sinon.useFakeTimers(clockTimestamp);
        // clock.shouldClearNativeTimers = true;

        try {
            if(arguments[2]) {
                arguments[2].clockTimestamp = clockTimestamp;
            } else {
                if (arguments.length < 3) arguments.length = 3;
                arguments[2] = { clockTimestamp };
            }
            result = originalFunction.apply(this, arguments);
        } catch (e) {
            console.log();
        }

        // clock.restore();

        return result;
    }

    jwt.verify = myFunctionWithHooks;

    return originalFunction;
}

function unpatchJwtVerify(originalFunction) {
    if (!jwt) return;
    jwt.verify = originalFunction;
}

module.exports = {
    patchJwtVerify,
    unpatchJwtVerify
};
