#!/usr/bin/env node
let { checkDependencies, searchAllModuleFolders } = require('./helpers/starting.js');
try {

    let findModules = ['express', 'mongodb', 'jsonwebtoken', 'ws'];
    let mapModules = searchAllModuleFolders(process.cwd(), findModules);

    for (let httpModule of ['http', 'https']) {
        require.cache[require.resolve(httpModule)] = {
            exports: require('./patches/http.js')(httpModule)
        };
    }

    for (let expressPath of mapModules.express) {
        try {
            require.cache[require.resolve('express')] = {
                exports: require('./patches/express.js')
            };
        } catch (e) {
            // console.log(`Can't patch Express at ${expressPath}`);
        }
    }

    for (let mongoPath of mapModules.mongodb) {
        try {
            require.cache[require.resolve(mongoPath + '/lib/collection.js')] = {
                exports: require('./patches/mongo-collection.js')(mongoPath)
            };
            require.cache[require.resolve(mongoPath + '/lib/mongo_client.js')] = {
                exports: require('./patches/mongo-client.js')(mongoPath)
            };
        } catch (e) {
            // console.log(`Can't patch mongodb at ${mongoPath}`);
        }
    }

    for (let jwtPath of mapModules.jsonwebtoken) {
        try {
            require.cache[require.resolve('jsonwebtoken/verify')] = {
                exports: require('./patches/jwt.js')(jwtPath)
            };
        } catch (e) {
            // console.log(`Can't patch JWT at ${jwtPath}`);
        }
    }

    for (let wsPath of mapModules.ws) {
        try {
            require.cache[require.resolve('ws')] = {
                exports: require('./patches/ws.js')(wsPath)
            };
        } catch (e) {
            // console.log(`Can't patch WS at ${wsPath}`);
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

