#!/usr/bin/env node
let { mode, initScript } = require('./argumentsCheck');
const path = require('path');
const fs = require('fs');
const Pytagora = require('./Pytagora.js');

global.Pytagora = new Pytagora(mode);

function checkDependencies() {
    const searchPath = process.cwd();
    const files = fs.readdirSync(searchPath);
    let mongoose, express;

    files.forEach(file => {
        if (file === "package.json") {
            const filePath = path.resolve(searchPath, file);
            const dependencies = JSON.parse(
                fs.readFileSync(filePath, "utf-8")
            ).dependencies;

            if(dependencies.mongoose) mongoose = true;
            if(dependencies.express) express = true;
        }
    });

    if (!mongoose || !express) {
        console.log('For Pytagora to run you need to use "mongoose" and "express" node modules. Exiting app...')
        process.exit(1);
    }
}

(async () => {
    await global.Pytagora.runRedisInterceptor();
    try {
        checkDependencies();

        console.log(path.join(process.cwd(), initScript));
        const app = require(path.join(process.cwd(), initScript));

        if (mode === 'test') {
            // TODO run tests once the app loads
            console.log('Running tests in 3 seconds...');
            setTimeout(() => {
                require('./RunPytagoraTests.js');
            }, 3000);
        }
    } catch (e) {
        console.error('Pytagora came across error: ', e);
    }
})();

