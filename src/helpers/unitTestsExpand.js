const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const { expandUnitTests, checkForAPIKey} = require('./api');
// const {PYTHAGORA_UNIT_DIR} = require("../const/common");
// const generator = require("@babel/generator").default;
const {delay, checkDirectoryExists} = require("../utils/common");
const {
    getAstFromFilePath,
    getRelatedTestImports,
    getSourceCodeFromAst,
    getModuleTypeFromFilePath
} = require("../utils/code");
const { getFunctionsForExport } = require("./unitTests")
const {getRelativePath, getFolderTreeItem, getTestFolderPath, checkPathType, isPathInside} = require("../utils/files");
const {initScreenForUnitTests} = require("./cmdGUI");
const { forEach } = require('lodash');
//const {green, red, blue, bold, reset} = require('../utils/cmdPrint').colors;

let functionList = {},
    leftPanel,
    rightPanel,
    screen,
    scrollableContent,
    spinner,
    rootPath = '',
    queriedPath = '',
    folderStructureTree = [],
    testsGenerated = [],
    errors = [],
    ignoreFolders = ['node_modules', 'pythagora_tests'],
    processExtensions = ['.js', '.ts'],
    ignoreErrors = ['BABEL_PARSER_SYNTAX_ERROR'],
    force
;

//the same like in uniTests.js - TODO: reuse it
async function saveTests(filePath, fileName, testData) {
    let dir = filePath.substring(0, filePath.lastIndexOf('/'));
    //dir = getTestFolderPath(filePath, rootPath);

    if (!await checkDirectoryExists(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    let testPath = path.join(dir, `/${fileName}`);
    fs.writeFileSync(testPath, testData);
    return testPath;
}

function reformatDataForPythagoraAPI(filePath, testCode, relatedCode, syntaxType) {
    const importedFiles = [];

    _.forEach(relatedCode, (f) =>  {
        const fileFolderPath = f.filePath.substring(0, f.filePath.lastIndexOf('/'))
        const pathRelativeToTest = getRelativePath(f.filePath, getTestFolderPath(fileFolderPath, rootPath));
        f.pathRelativeToTest = pathRelativeToTest;
        //f.fileName = f.fileName.substring(f.fileName.lastIndexOf('/') + 1);

        if (!importedFiles.find(i => i.filePath == f.filePath)) {
            importedFiles.push({
                fileName: f.fileName.substring(f.fileName.lastIndexOf('/') + 1),
                filePath: f.filePath,
                pathRelativeToTest: f.pathRelativeToTest,
                syntaxType: f.syntaxType
            })
        }
    })

    const testFilePath = getTestFolderPath(filePath, rootPath);
    const pathRelativeToTest = getRelativePath(filePath, testFilePath);

    return {
        testFileName: filePath.substring(filePath.lastIndexOf('/') + 1),
        testCode,
        relatedCode,
        importedFiles,
        isES6Syntax: syntaxType === 'ES6',
        pathRelativeToTest
    }
}

async function createAdditionalTests(filePath, prefix) {
    //TODO-1: get test source code and source code of related functions (import, require)
    const ast = await getAstFromFilePath(filePath);
    let syntaxType = await getModuleTypeFromFilePath(ast);

    //const testCode = getSourceCodeFromAst(ast);

    const importRegex = /^(.*import.*|.*require.*)$/gm;
    let testCode = getSourceCodeFromAst(ast);
    testCode = testCode.replace(importRegex, '');


    const relatedTestCode = getRelatedTestImports(ast, filePath, functionList)

    // Now we have test source code and related test functions source code (imported or required)
    // TODO-1: reformat data

    const testPath = getTestFolderPath(filePath, rootPath)
    const formattedData = reformatDataForPythagoraAPI(filePath, testCode, relatedTestCode, syntaxType)

    // TODO-2: send date to API for processing
    // TODO-3: check only for *.test.js files pattern
    // TODO-4: save processing results data

    console.log('formattedData: ', formattedData)
    let { tests, error } = await expandUnitTests(formattedData);
    if (tests) {
        await saveTests(testPath, formattedData.testFileName, tests);
    }
    
    // TODO-5: display processing progress in a proper way
}

function checkForTestFilePath(filePath) {
    const pattern = /test\.(js|ts)$/;
    return pattern.test(filePath);
    // if (pattern.test(filePath)) return true
    // else 
}

async function traverseDirectoryTests(directory, prefix = '') {
    if (await checkPathType(directory) === 'file' && checkForTestFilePath(directory)) {
        const newPrefix = `|   ${prefix}|   `;
        return await createAdditionalTests(directory, newPrefix);
    } else if (await checkPathType(directory) === 'file' && !checkForTestFilePath(directory)) {
        throw new Error('Invalid test file path');
    }

    const files = fs.readdirSync(directory);
    for (const file of files) {
        const absolutePath = path.join(directory, file);
        const stat = fs.statSync(absolutePath);
        //const isLast = files.indexOf(file) === files.length - 1;
        if (stat.isDirectory()) {
            if (ignoreFolders.includes(path.basename(absolutePath))  || path.basename(absolutePath).charAt(0) === '.') continue;

            //const newPrefix = isLast ? `${prefix}    ` : `${prefix}|   `;
            await traverseDirectoryTests(absolutePath, prefix);
        } else {
            if (!processExtensions.includes(path.extname(absolutePath)) || !checkForTestFilePath(file)) continue;
            //const newPrefix = isLast ? `|   ${prefix}    ` : `|   ${prefix}|   `;
            //await createAdditionalTests(absolutePath, newPrefix);
            await createAdditionalTests(absolutePath, prefix);
        }
    }
}

async function expandTestsForDirectory(args) {
    let pathToProcess = args.expand_path,
        force = args.force;

    checkForAPIKey();
    queriedPath = path.resolve(pathToProcess);
    rootPath = process.cwd();
    ({ screen, spinner, scrollableContent } = initScreenForUnitTests());
    functionList = await getFunctionsForExport(rootPath)

    await traverseDirectoryTests(queriedPath, false)

    process.exit(0);
}

module.exports = {
    expandTestsForDirectory
}
