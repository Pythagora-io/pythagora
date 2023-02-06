#!/usr/bin/env node
let { mode, initScript } = require('./src/utils/argumentsCheck.js');
let { checkDependencies } = require('./src/helpers/starting.js');
const Pytagora = require('./src/Pytagora.js');

const path = require('path');

global.Pytagora = new Pytagora(mode);

(async () => {
    let app;
    await global.Pytagora.runRedisInterceptor();
    try {
        checkDependencies();

        console.log(path.join(process.cwd(), initScript));
        app = require(path.join(process.cwd(), initScript));
    } catch (e) {
        console.error('The app has crashed!');
        console.error('This is likely not related to Pytagora, but the app itself.');
        console.error(e);
        process.exit(1);
    }

    if (mode === 'test') {
        // TODO run tests once the app loads
        console.log('Running tests in 3 seconds...');
        setTimeout(() => {
            require('./RunPytagoraTests.js');
        }, 3000);
    }
})();

