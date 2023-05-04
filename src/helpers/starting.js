const path = require('path');
const fs = require('fs');
const tryrequire = require('tryrequire');
const { PYTHAGORA_METADATA_DIR, PYTHAGORA_TESTS_DIR, METADATA_FILENAME, PYTHAGORA_DELIMITER } = require('../const/common.js');
const { getCircularReplacer } = require('../utils/common.js');
const { logAndExit } = require('../utils/cmdPrint.js');


function checkDependencies() {
    let mongodb = tryrequire('mongodb');
    let express = tryrequire('express');

    if (!mongodb || !express) throw new Error(`'Pythagora is unable to check dependencies. Express and MongoDb are necessary for Pythagora to run. Exiting...`);
}

function searchAllModuleFolders(rootDir, moduleNames) {
    let modulePaths = moduleNames.reduce((obj, key) => ({ ...obj, [key]: [] }), {});
    fs.readdirSync(rootDir).forEach(file => {
        const filePath = path.join(rootDir, file);
        const isDirectory = fs.lstatSync(filePath).isDirectory();

        if (isDirectory) {
            if (moduleNames.includes(file) && filePath.includes('node_modules')) {
                modulePaths[file].push(filePath);
            } else {
                let  modulePathsRecursive = searchAllModuleFolders(filePath, moduleNames);
                for (const key of moduleNames) {
                    modulePaths[key] = [...modulePaths[key], ...modulePathsRecursive[key]];
                }
            }
        }
    });
    return modulePaths;
}

function getPythagoraVersion(pythagora) {
    const searchPath = process.cwd();

    const findPackageJson = (dir) => {
        const files = fs.readdirSync(dir);

        files.forEach(file => {
            const filePath = path.resolve(dir, file);
            const fileStat = fs.statSync(filePath);

            if (fileStat.isDirectory() && file[0] !== '.' && file !== 'node_modules') {
                findPackageJson(filePath);
            } else if (file === "package.json") {
                const dependencies = JSON.parse(
                    fs.readFileSync(filePath, "utf-8")
                ).dependencies;

                if(dependencies.pythagora) pythagora.version = dependencies.pythagora;
                if(dependencies['@pythagora.io/pythagora-dev']) pythagora.devVersion = dependencies['@pythagora.io/pythagora-dev'];
            }
        });
    };

    findPackageJson(searchPath);
}

function startPythagora(args, app) {
    if (!app) return;
    const Pythagora = require("../Pythagora");

    global.Pythagora = new Pythagora(args);
    global.Pythagora.setMongoClient(global.pythagoraMongoClient);
    global.Pythagora.runRedisInterceptor().then(() => {
        if (args.mode === 'test') {
            global.Pythagora.runWhenServerReady(() => {
                require('../RunPythagoraTests.js');
            });
        }
    });

    app.isPythagoraExpressInstance = true;
}

module.exports = {
    logAndExit,
    checkDependencies,
    searchAllModuleFolders,
    getPythagoraVersion,
    startPythagora
}
