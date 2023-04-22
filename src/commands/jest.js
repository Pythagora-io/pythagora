const jest = require('jest');
const {EXPORTED_TESTS_DIR} = require("../const/common");
let fs = require('fs');
const userMongoSetup = require(`../../../../${EXPORTED_TESTS_DIR}/global-setup`);
const pythagoraJestMethods = require("../helpers/jestMethods");
const requiredJestSetupMethods = [
    'setUpDb',
    'cleanUpDb',
    'getMongoCollection',
];

function check() {
    let authFile = `./${EXPORTED_TESTS_DIR}/auth.js`;
    if (!fs.existsSync(authFile)) {
        // TODO better log

        console.error(`Please finish the authentication priming to export tests to Jest.`);
        process.exit(1);
    }
}

function run() {
    check();

    userMongoSetup();
    for (let method of requiredJestSetupMethods) {
        global[method] = global[method] || pythagoraJestMethods[method];
    }

    jest.run();
}

module.exports = {
    run
}
