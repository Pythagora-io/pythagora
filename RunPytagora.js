#!/usr/bin/env node
const path = require('path');

const AVAILABLE_MODES = ['capture', 'test'];
let { mode, initScript } = require('minimist')(process.argv.slice(2));
if (!initScript) {
    console.error(`
Please provide the script that you use to start your Node.js app by adding --initScript=<relative path to the file you would usually run to start your app>.

Eg. --initScript=./app.js
`);
    process.exit(1);
} else if (!mode) {
    console.log('Mode not provided. Defaulting to "capture".');
    mode = 'capture';
} else if (!AVAILABLE_MODES.includes(mode)) {
    console.error(`Mode "${mode}" not recognized. Available modes are: ${AVAILABLE_MODES.join(', ')}`);
    process.exit(1);
}

const Pytagora = require('./Pytagora.js');

console.log(`Running ${initScript} using Pytagora in '${mode.toUpperCase()}' mode.`);
const P = new Pytagora(mode);
global.Pytagora = P;
(async () => {
    await P.runRedisInterceptor();
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

