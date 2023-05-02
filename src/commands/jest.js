const jest = require('jest');
const {EXPORTED_TESTS_DIR} = require("../const/common");
let fs = require('fs');
const pythagoraJestMethods = require("../helpers/jestMethods");
const {primeJestLog} = require("../utils/cmdPrint");
const requiredJestSetupMethods = [
    'setUpDb',
    'cleanUpDb',
    'getMongoCollection',
];

function check() {
    let userJestSetupExists = fs.existsSync(`./${EXPORTED_TESTS_DIR}/global-setup.js`);
    if (!userJestSetupExists) {
        console.log(`No Jest global setup found, copying default one from Pythagora.`);
        fs.copyFileSync(`node_modules/pythagora/src/templates/jest-global-setup.js`, `${EXPORTED_TESTS_DIR}/global-setup.js`);
    }

    let authFile = `./${EXPORTED_TESTS_DIR}/auth.js`;
    if (!fs.existsSync(authFile)) {
        primeJestLog();
        process.exit(1);
    }
}

function run() {
    check();
    // TODO better way to import this
    const userJestSetup = require(`../../../../${EXPORTED_TESTS_DIR}/global-setup`);
    userJestSetup();
    for (let method of requiredJestSetupMethods) {
        global[method] = global[method] || pythagoraJestMethods[method];
    }

    jest.run().then(() => {
        console.log('Jest tests finished');
        process.exit(0);
    });
}

module.exports = {
    run
}
