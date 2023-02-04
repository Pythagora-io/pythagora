#!/usr/bin/env node
let { mode, initScript } = require('./argumentsCheck');
const path = require('path');
const fs = require('fs');
const Pytagora = require('./Pytagora.js');

global.Pytagora = new Pytagora(mode);

function checkDependencies() {
    const searchPath = process.cwd();
    let mongoose, express;

    const findPackageJson = (dir) => {
        if (mongoose && express) return;
        const files = fs.readdirSync(dir);

        files.forEach(file => {
            if (mongoose && express) return;
            const filePath = path.resolve(dir, file);
            const fileStat = fs.statSync(filePath);

            if (fileStat.isDirectory() && file[0] !== '.' && file !== 'node_modules') {
                findPackageJson(filePath);
            } else if (file === "package.json") {
                const dependencies = JSON.parse(
                    fs.readFileSync(filePath, "utf-8")
                ).dependencies;

                if(dependencies.mongoose) mongoose = true;
                if(dependencies.express) express = true;
            }
        });
    };

    findPackageJson(searchPath);

    if (!mongoose || !express) {
        console.log('For Pytagora to run you need to use "mongoose" and "express" node modules. Exiting app...')
        process.exit(1);
    }
}

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

