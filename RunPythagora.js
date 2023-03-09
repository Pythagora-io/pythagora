#!/usr/bin/env node
let { checkDependencies, searchAllModuleFolders } = require('./src/helpers/starting.js');
try {

    for (let httpModule of ['http', 'https']) {
        require.cache[require.resolve(httpModule)] = {
            exports: require('./src/patches/http.js')(httpModule)
        };
    }

    // TODO - optimize by runnning only once through folders for both express and mongo
    for (let expressPath of searchAllModuleFolders(process.cwd(), 'express')) {
        try {
            require.cache[require.resolve('express')] = {
                exports: require('./src/patches/express.js')
            };
        } catch (e) {
            // console.log(`Can't patch Express at ${expressPath}`);
        }
    }

    for (let mongoPath of searchAllModuleFolders(process.cwd(), 'mongodb')) {
        try {
            require.cache[require.resolve(mongoPath + '/lib/collection.js')] = {
                exports: require('./src/patches/mongo-collection.js')(mongoPath)
            };
            require.cache[require.resolve(mongoPath + '/lib/mongo_client.js')] = {
                exports: require('./src/patches/mongo-client.js')(mongoPath)
            };
        } catch (e) {
            // dummy catch
        }
    }

    // TODO @Leon finish checkDependencies
    // checkDependencies();
} catch (e) {
    console.log(`\x1b[31m${e.stack}\x1b[0m`);
    process.exit(1);
}

const path = require('path');

process.on('uncaughtException', (error) => {
    console.error('The app has crashed!');
    console.error('This is likely not related to Pythagora, but the app itself.');
    console.error(error);
    process.exit(1);
});

