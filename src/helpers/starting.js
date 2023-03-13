const path = require('path');
const fs = require('fs');
const tryrequire = require('tryrequire');
const { PYTHAGORA_METADATA_DIR, PYTHAGORA_TESTS_DIR, METADATA_FILENAME } = require('../const/common.js');
const { getCircularReplacer } = require('../utils/common.js');

function logAndExit(message, type='error') {
    console[type](message);
    process.exit(1);
}

function deleteTest(id) {
    try {
        if (typeof id !== 'string') logAndExit(`When using --delete flag with Pythagora you have to give test ID (of test you want to delete).`);
        let files = fs.readdirSync(`./${PYTHAGORA_TESTS_DIR}/`);

        files = files.filter(f => f[0] !== '.');
        for (let file of files) {
            if (file[0] !== '|') continue;
            let tests = JSON.parse(fs.readFileSync(`./${PYTHAGORA_TESTS_DIR}/${file}`));
            let newTests = tests.filter((t) => t.id !== id);

            if (tests.length !== newTests.length) fs.writeFileSync(`./${PYTHAGORA_TESTS_DIR}/${file}`, JSON.stringify(newTests, getCircularReplacer(), 2));
        }

        logAndExit(`Successfully deleted test with id: ${id}!`, 'log');
    } catch (e) {
        logAndExit(e);
    }
}

function deleteAllFailedTests() {
    try {
        let metadata = fs.readFileSync(`./${PYTHAGORA_METADATA_DIR}/${METADATA_FILENAME}`);
        metadata = JSON.parse(metadata);
        if (!metadata || !metadata.runs || !metadata.runs.length ||
            !metadata.runs[metadata.runs.length - 1].failed.length) return logAndExit('Previous test run had no failed tests. Nothing to delete, exiting...', 'log');

        let deleteTests = metadata.runs[metadata.runs.length - 1].failed;
        let files = fs.readdirSync(`./${PYTHAGORA_TESTS_DIR}/`);

        files = files.filter(f => f[0] !== '.');
        for (let file of files) {
            if (file[0] !== '|') continue;
            let tests = JSON.parse(fs.readFileSync(`./${PYTHAGORA_TESTS_DIR}/${file}`));
            let newTests = tests.filter((t) => !deleteTests.includes(t.id));

            if (tests.length !== newTests.length) fs.writeFileSync(`./${PYTHAGORA_TESTS_DIR}/${file}`, JSON.stringify(newTests, getCircularReplacer(), 2));
        }

        logAndExit('Successfully deleted all failed tests!', 'log');
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
                console.log(`Found MongoDB module folder: ${filePath}`);
            } else {
                listOfModulePaths = listOfModulePaths.concat(searchAllModuleFolders(filePath, moduleName));
            }
        }
    });
    return listOfModulePaths;
}

module.exports = {
    logAndExit,
    deleteTest,
    deleteAllFailedTests,
    checkDependencies,
    searchAllModuleFolders
}
