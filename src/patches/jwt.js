// const sinon = require("sinon");

module.exports = function(jwtPath) {
    let originalJwt = require(`${jwtPath}`);

    let originalVerify = originalJwt.verify;
    const patchedVerify = function(token, secretOrPublicKey, options={}, callback) {
        if (global.Pythagora &&
            global.Pythagora.tempVars &&
            global.Pythagora.tempVars.clockTimestamp) {
            // let clock = sinon.useFakeTimers(clockTimestamp);
            // clock.shouldClearNativeTimers = true;

            options.clockTimestamp = global.Pythagora.tempVars.clockTimestamp / 1000;

            // clock.restore();
        }

        return originalVerify.apply(this, [token, secretOrPublicKey, options, callback]);
    }

    patchedVerify.prototype = originalVerify.prototype;

    for (const key in originalVerify) {
        patchedVerify[key] = originalVerify[key];
    }

    originalJwt.verify = patchedVerify;

    return originalJwt;
}
