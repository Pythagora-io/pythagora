const path = require('path');
const fs = require('fs');
const tryrequire = require('tryrequire');

function checkDependencies() {
    let mongodb = tryrequire('mongodb');
    let express = tryrequire('express');

    if (!mongodb || !express) throw new Error(`'Pythagora is unable to check dependencies. Express and MongoDb are necesssary for Pythagora to run. Exiting...`);
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
    checkDependencies,
    searchAllModuleFolders
}
