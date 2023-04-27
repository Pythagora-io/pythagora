const path = require('path');
const fs = require('fs');
const tryrequire = require('tryrequire');
const { PYTHAGORA_METADATA_DIR, PYTHAGORA_TESTS_DIR, METADATA_FILENAME, PYTHAGORA_DELIMITER } = require('../const/common.js');
const { getCircularReplacer } = require('../utils/common.js');
const { logAndExit } = require('../utils/cmdPrint.js');


function deleteTest(id) {
    try {
        if (typeof id !== 'string') logAndExit(`When using --delete flag with Pythagora you have to give test ID (of test you want to delete).`);
        let files = fs.readdirSync(`./${PYTHAGORA_TESTS_DIR}/`);

        files = files.filter(f => f[0] !== '.');
        for (let file of files) {
            if (file.indexOf(PYTHAGORA_DELIMITER) !== 0) continue;
            let tests = JSON.parse(fs.readFileSync(`./${PYTHAGORA_TESTS_DIR}/${file}`));
            let newTests = tests.filter((t) => t.id !== id);

            if (tests.length !== newTests.length) fs.writeFileSync(`./${PYTHAGORA_TESTS_DIR}/${file}`, JSON.stringify(newTests, getCircularReplacer(), 2));
        }

        logAndExit(`Successfully deleted test with id: ${id}!`, 'log');
    } catch (e) {
        logAndExit(e);
    }
}

function checkDependencies() {
    let mongodb = tryrequire('mongodb');
    let express = tryrequire('express');

    if (!mongodb || !express) throw new Error(`'Pythagora is unable to check dependencies. Express and MongoDb are necessary for Pythagora to run. Exiting...`);
}

function searchAllModuleFolders(rootDir, moduleName) {
    let listOfModulePaths = [];
    fs.readdirSync(rootDir).forEach(file => {
        const filePath = path.join(rootDir, file);
        const isDirectory = fs.lstatSync(filePath).isDirectory();

        if (isDirectory) {
            if (file === moduleName && filePath.includes('node_modules')) {
                listOfModulePaths.push(filePath);
            } else {
                listOfModulePaths = listOfModulePaths.concat(searchAllModuleFolders(filePath, moduleName));
            }
        }
    });
    return listOfModulePaths;
}

function getAllJavascriptFiles(dir, excludeNodeModules = true) {
    const result = [];

    function walk(currentDir) {
        const files = fs.readdirSync(currentDir);

        for (const file of files) {
            const filePath = path.join(currentDir, file);
            const stat = fs.statSync(filePath);

            if (excludeNodeModules && path.basename(currentDir) === 'node_modules') {
                continue;
            }

            if (stat.isDirectory()) {
                walk(filePath);
            } else if (stat.isFile() && /\.(js|mjs|cjs|ts|tsx)$/i.test(file)) {
                result.push(filePath);
            }
        }
    }

    walk(dir);
    return result;
}

module.exports = {
    logAndExit,
    deleteTest,
    checkDependencies,
    searchAllModuleFolders,
    getAllJavascriptFiles
}
