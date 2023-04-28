#!/usr/bin/env node
let { checkDependencies, searchAllModuleFolders, getAllJavascriptFiles } = require('./helpers/starting.js');
const codeTracer = require('./helpers/tracer');
let args = require('./utils/argumentsCheck.js');
try {

    if (args.mode === 'export' && args.deep_export) {
        console.log('Setting up Pythagora tracer...');
        let repoFiles = getAllJavascriptFiles(process.cwd(), true);
        codeTracer.patchModuleLoad(repoFiles);
    }

    for (let httpModule of ['http', 'https']) {
        require.cache[require.resolve(httpModule)] = {
            exports: require('./patches/http.js')(httpModule)
        };
    }

    // TODO - optimize by runnning only once through folders for both express and mongo
    for (let expressPath of searchAllModuleFolders(process.cwd(), 'express')) {
        try {
            require.cache[require.resolve('express')] = {
                exports: require('./patches/express.js')
            };
        } catch (e) {
            // console.log(`Can't patch Express at ${expressPath}`);
        }
    }

    for (let mongoPath of searchAllModuleFolders(process.cwd(), 'mongodb')) {
        try {
            require.cache[require.resolve(mongoPath + '/lib/collection.js')] = {
                exports: require('./patches/mongo-collection.js')(mongoPath)
            };
            require.cache[require.resolve(mongoPath + '/lib/mongo_client.js')] = {
                exports: require('./patches/mongo-client.js')(mongoPath)
            };
        } catch (e) {
            // dummy catch
        }
    }

    for (let jwtPath of searchAllModuleFolders(process.cwd(), 'jsonwebtoken')) {
        try {
            require.cache[require.resolve('jsonwebtoken/verify')] = {
                exports: require('./patches/jwt.js')(jwtPath)
            };
        } catch (e) {
            // console.log(`Can't patch JWT at ${jwtPath}`);
        }
    }

    checkDependencies();
} catch (e) {
    console.log(`\x1b[31m${e.stack}\x1b[0m`);
    process.exit(1);
}

process.on('uncaughtException', (error) => {
    console.error('The app has crashed!');
    console.error('This is likely not related to Pythagora, but the app itself.');
    console.error(error);
    process.exit(1);
});

