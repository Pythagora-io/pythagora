// const sinon = require("sinon");

module.exports = function(jwtPath) {
    let originalJwt = require(`${jwtPath}/verify`);
    const patchedJwt = function(token, secretOrPublicKey, options={}, callback) {
        if (global.Pythagora &&
            global.Pythagora.tempVars &&
            global.Pythagora.tempVars.clockTimestamp) {
            // let clock = sinon.useFakeTimers(clockTimestamp);
            // clock.shouldClearNativeTimers = true;

            options.clockTimestamp = global.Pythagora.tempVars.clockTimestamp;

            // clock.restore();
        }
        return originalJwt(token, secretOrPublicKey, options, callback);
    }
    return patchedJwt;
}
