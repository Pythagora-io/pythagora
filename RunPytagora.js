#!/usr/bin/env node
let { mode, initScript } = require('./argumentsCheck');
const path = require('path');
const Pytagora = require('./Pytagora.js');

global.Pytagora = new Pytagora(mode);

(async () => {
    await global.Pytagora.runRedisInterceptor();
    try {
        console.log(path.join(process.cwd(), initScript));
        const app = require(path.join(process.cwd(), initScript));

        if (mode === 'test') {
            // TODO run tests once the app loads
            console.log('Running tests in 3 seconds...');
            setTimeout(() => {
                console.log('Running tests...');
                require('./RunPytagoraTests.js');
            }, 3000);
        }
    } catch (e) {
        console.error('Pytagora isn\'t able to find the initScript you provided. Please make sure the path is correct.');
    }
})();

