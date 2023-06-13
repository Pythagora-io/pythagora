const fs = require('fs').promises;
const path = require('path');
const _ = require('lodash');
const { getUnitTests, checkForAPIKey} = require('./api');
const {PYTHAGORA_UNIT_DIR} = require("../const/common");
const generator = require("@babel/generator").default;
const {delay, checkDirectoryExists} = require("../utils/common");
const {
    stripUnrelatedFunctions,
    replaceRequirePaths,
    getAstFromFilePath,
    processAst,
    getRelatedFunctions,
    getModuleTypeFromFilePath
} = require("../utils/code");
const {getRelativePath, getFolderTreeItem, getTestFilePath, checkPathType, isPathInside} = require("../utils/files");
const {initScreenForUnitTests} = require("./cmdGUI");
const {green, red, blue, bold, reset} = require('../utils/cmdPrint').colors;

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
    ignoreFolders = ['node_modules', 'pythagora_tests']
;

async function processFile(filePath) {
    try {
        let exportsFn = [];
        let exportsObj = [];
        let functions = [];
        let ast = await getAstFromFilePath(filePath);
        let syntaxType = await getModuleTypeFromFilePath(ast);
        processAst(ast, (funcName, path, type) => {
            if (type === 'exportFnDef') exportsFn.push(funcName);
            if (type === 'exportFn') {
                exportsFn.push(funcName);
            } else if (type === 'exportObj') {
                exportsObj.push(funcName);
            } else {
                functions.push({
                    funcName,
                    code: generator(path.node).code,
                    filePath: filePath,
                    relatedFunctions: getRelatedFunctions(path.node, ast, filePath, functionList)
                });
            }
        });
        for (let f of functions) {
            // TODO refactor since this is being set in code.js and here it's reverted
            let classParent = exportsFn.find(e => (new RegExp(`${e}\..*`)).test(f.funcName)) ||
                exportsObj.find(e => (new RegExp(`${e}\..*`)).test(f.funcName));

            let isExportedAsObject = exportsObj.includes(f.funcName) || exportsObj.includes(classParent);

            // if (classParent) f.funcName = f.funcName.replace(classParent + '.', '');

            functionList[filePath + ':' + f.funcName] = _.extend(f,{
                classParent,
                syntaxType,
                exported: exportsFn.includes(f.funcName) || isExportedAsObject || !!classParent,
                exportedAsObject: isExportedAsObject,
                funcName: f.funcName
            });
        }
    } catch (e) {
        // writeLine(`Error parsing file ${filePath}: ${e}`);
    }
}

async function reformatDataForPythagoraAPI(funcData, filePath, testFilePath) {
    let relatedCode = _.groupBy(funcData.relatedCode, 'fileName');
    relatedCode = _.map(relatedCode, (value, key)  => ({ fileName: key, functionNames: value.map(item => item.funcName) }));
    let relatedCodeInSameFile = [funcData.functionName];
    funcData.relatedCode = [];
    for (const file of relatedCode) {
        if (file.fileName === filePath) {
            relatedCodeInSameFile = relatedCodeInSameFile.concat(file.functionNames);
        } else {
            let fileName = getRelativePath(file.fileName, filePath);
            let code = await stripUnrelatedFunctions(file.fileName, file.functionNames);
            let fullPath = filePath.substring(0, filePath.lastIndexOf('/')) + '/' + fileName;
            code = replaceRequirePaths(code, filePath, path.resolve(PYTHAGORA_UNIT_DIR) + '/brija.test.js');
            funcData.relatedCode.push({
                fileName,
                code,
                pathRelativeToTest: getRelativePath(fullPath, testFilePath + '/brija.test.js')
            });
        }
    }
    funcData.functionCode = await stripUnrelatedFunctions(filePath, relatedCodeInSameFile);
    funcData.functionCode = replaceRequirePaths(funcData.functionCode, path.dirname(filePath), path.resolve(PYTHAGORA_UNIT_DIR) + '/brija.test.js');
    funcData.pathRelativeToTest = getRelativePath(filePath, testFilePath + '/brija.test.js');
    return funcData;
}

async function createTests(filePath, prefix, funcToTest) {
    try {
        let ast = await getAstFromFilePath(filePath);
        const fileIndex = folderStructureTree.findIndex(item => item.absolutePath === filePath);

        const foundFunctions = [];

        processAst(ast, (funcName, path, type) => {
            if (type === 'exportFn' || type === 'exportObj') return;
            if (funcToTest && funcName !== funcToTest) return;

            let functionFromTheList = functionList[filePath + ':' + funcName];
            if (functionFromTheList && functionFromTheList.exported) {
                // TODO refactor since this is being set in code.js and here it's reverted
                if (functionFromTheList.classParent) funcName = funcName.replace(functionFromTheList.classParent + '.', '')
                foundFunctions.push({
                    functionName: funcName,
                    functionCode: functionFromTheList.code,
                    relatedCode: functionFromTheList.relatedFunctions,
                    classParent: functionFromTheList.classParent,
                    isES6Syntax: functionFromTheList.syntaxType === 'ES6',
                    exportedAsObject: functionFromTheList.exportedAsObject
                });
            }
        });

        for (const [i, funcData] of foundFunctions.entries()) {
            let isLast = foundFunctions.indexOf(funcData) === foundFunctions.length - 1;
            let indexToPush = fileIndex + 1 + i;
            folderStructureTree.splice(
                indexToPush,
                0,
                getFolderTreeItem(
                    prefix,
                    isLast,
                    `${funcData.functionName}.test.js`,
                    filePath + ':' + funcData.functionName
                )
            );
            spinner.start(folderStructureTree, indexToPush);

            let formattedData = await reformatDataForPythagoraAPI(funcData, filePath, getTestFilePath(filePath, rootPath));
            let tests = await getUnitTests(formattedData, (content) => {
                scrollableContent.setContent(content);
                scrollableContent.setScrollPerc(100);
                screen.render();
            });
            let testPath = await saveTests(filePath, funcData.functionName, tests);
            testsGenerated.push(testPath);
            await spinner.stop();
            folderStructureTree[indexToPush].line = `${green}${folderStructureTree[indexToPush].line}${reset}`;
        }

        if (foundFunctions.length > 0) {
            folderStructureTree[fileIndex].line = `${green+bold}${folderStructureTree[fileIndex].line}${reset}`;
        }

    } catch (e) {
        // writeLine(`Error parsing file ${filePath}: ${e}`);
    }
}

async function saveTests(filePath, name, testData) {
    let dir = getTestFilePath(filePath, rootPath);

    if (!await checkDirectoryExists(dir)) {
        await fs.mkdir(dir, { recursive: true });
    }

    let testPath = path.join(dir, `/${name}.test.js`);
    await fs.writeFile(testPath, testData);
    return testPath;
}

async function traverseDirectory(directory, onlyCollectFunctionData, prefix = '', funcName) {
    if (await checkPathType(directory) === 'file' && !onlyCollectFunctionData) {
        if (path.extname(directory) !== '.js') throw new Error('File is not a javascript file');
        const newPrefix = `|   ${prefix}|   `;
        return await createTests(directory, newPrefix, funcName);
    }
    const files = await fs.readdir(directory);
    for (const file of files) {
        const absolutePath = path.join(directory, file);
        const stat = await fs.stat(absolutePath);
        const isLast = files.indexOf(file) === files.length - 1;
        if (stat.isDirectory()) {
            if (ignoreFolders.includes(path.basename(absolutePath))  || path.basename(absolutePath).charAt(0) === '.') continue;

            if (onlyCollectFunctionData && isPathInside(path.dirname(queriedPath), absolutePath)) {
                updateFolderTree(prefix, isLast, absolutePath)
            }

            const newPrefix = isLast ? `${prefix}    ` : `${prefix}|   `;
            await traverseDirectory(absolutePath, onlyCollectFunctionData, newPrefix, funcName);
        } else {
            if (path.extname(absolutePath) !== '.js') continue;
            if (onlyCollectFunctionData) {
                if (isPathInside(path.dirname(queriedPath), absolutePath)) {
                    updateFolderTree(prefix, isLast, absolutePath);
                }
                await processFile(absolutePath);
            } else {
                const newPrefix = isLast ? `|   ${prefix}    ` : `|   ${prefix}|   `;
                await createTests(absolutePath, newPrefix, funcName);
            }
        }
    }
}

function updateFolderTree(prefix, isLast, absolutePath) {
    if (!folderStructureTree.find(fst => fst.absolutePath === absolutePath)) {
        folderStructureTree.push(getFolderTreeItem(prefix, isLast, path.basename(absolutePath), absolutePath));
    }
}

async function getFunctionsForExport(dirPath) {
    rootPath = dirPath;
    await traverseDirectory(rootPath, true);
    await traverseDirectory(rootPath, true);
    return functionList;
}

async function generateTestsForDirectory(pathToProcess, funcName) {

    checkForAPIKey();
    queriedPath = path.resolve(pathToProcess);
    rootPath = process.cwd();
    ({ screen, spinner, scrollableContent } = initScreenForUnitTests());

    await traverseDirectory(rootPath, true);  // first pass: collect all function names and codes
    await traverseDirectory(rootPath, true);  // second pass: collect all related functions
    await traverseDirectory(queriedPath, false, undefined, funcName);  // second pass: print functions and their related functions

    screen.destroy();
    process.stdout.write('\x1B[2J\x1B[0f');
    if (testsGenerated.length === 0) {
        console.log(`${bold+red}No tests generated${funcName ? ' - can\'t find a function named "' + funcName + '"' : ''}!${reset}`);
    } else {
        console.log(`Tests are saved in the following directories:${testsGenerated.reduce((acc, item) => acc + '\n' + blue + item, '')}`);
        console.log(`${bold+green}${testsGenerated.length} unit tests generated!${reset}`);
    }
    process.exit(0);
}

module.exports = {
    getFunctionsForExport,
    generateTestsForDirectory
}
