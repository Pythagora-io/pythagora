const fs = require('fs').promises;
const path = require('path');
const _ = require('lodash');
const { getUnitTests } = require('./api');
const {PYTHAGORA_UNIT_DIR} = require("../const/common");
const generator = require("@babel/generator").default;
const {delay, checkDirectoryExists} = require("../utils/common");
const {
    stripUnrelatedFunctions,
    replaceRequirePaths,
    getAstFromFilePath,
    processAst,
    getRelatedFunctions,
    collectTopRequires
} = require("../utils/code");
const {getRelativePath, getFolderTreeItem, getTestFilePath, checkPathType, isPathInside} = require("../utils/files");
const {initScreenForUnitTests} = require("./cmdGUI");
const {green, red, bold, reset} = require('../utils/CmdPrint').colors;

let functionList = {},
    leftPanel,
    rightPanel,
    screen,
    scrollableContent,
    spinner,
    rootPath = '',
    queriedPath = '',
    folderStructureTree = [],
    testsGenerated = 0
;

async function processFile(filePath) {
    try {
        let exports = [];
        let functions = [];
        let ast = await getAstFromFilePath(filePath);
        processAst(ast, (funcName, path, type) => {
            if (type === 'export') {
                exports.push(funcName);
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
            functionList[filePath + ':' + f.funcName] = _.extend(f,{
                exported: exports.includes(f.funcName)
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
        const topRequires = collectTopRequires(ast);
        const fileIndex = folderStructureTree.findIndex(item => item.absolutePath === filePath);

        const foundFunctions = [];

        processAst(ast, (funcName, path, type) => {
            if (type === 'export') return;
            if (funcToTest && funcName !== funcToTest) return;

            let functionFromTheList = functionList[filePath + ':' + funcName];
            if (functionFromTheList && functionFromTheList.exported) {
                foundFunctions.push({
                    functionName: funcName,
                    functionCode: functionFromTheList.code,
                    relatedCode: functionFromTheList.relatedFunctions
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
            await saveTests(filePath, funcData.functionName, tests);
            testsGenerated++;
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

    await fs.writeFile(path.join(dir, `/${name}.test.js`), testData);
}

async function traverseDirectory(directory, onlyCollectFunctionData, prefix = '', funcName) {
    if (await checkPathType(directory) === 'file' && !onlyCollectFunctionData) {
        if (path.extname(directory) !== '.js') throw new Error('File is not a javascript file');
        return await createTests(directory, prefix, funcName);
    }
    const files = await fs.readdir(directory);
    for (const file of files) {
        const absolutePath = path.join(directory, file);
        const stat = await fs.stat(absolutePath);
        const isLast = files.indexOf(file) === files.length - 1;
        if (stat.isDirectory()) {
            if (onlyCollectFunctionData && isPathInside(path.dirname(queriedPath), absolutePath)) {
                folderStructureTree.push(getFolderTreeItem(prefix, isLast, path.basename(absolutePath), absolutePath));
            }

            if (path.basename(absolutePath) !== 'node_modules') {
                const newPrefix = isLast ? `${prefix}    ` : `${prefix}|   `;
                await traverseDirectory(absolutePath, onlyCollectFunctionData, newPrefix, funcName);
            }
        } else {
            if (path.extname(absolutePath) !== '.js') continue;
            if (onlyCollectFunctionData) {
                if (isPathInside(path.dirname(queriedPath), absolutePath)) {
                    folderStructureTree.push(getFolderTreeItem(prefix, isLast, path.basename(absolutePath), absolutePath));
                }
                await processFile(absolutePath);
            } else {
                const newPrefix = isLast ? `${prefix}    ` : `${prefix}|   `;
                await createTests(absolutePath, newPrefix, funcName);
            }
        }
    }
}

async function getFunctionsForExport(dirPath) {
    rootPath = dirPath;
    await traverseDirectory(rootPath, true);
    await traverseDirectory(rootPath, true);
    return functionList;
}

async function generateTestsForDirectory(pathToProcess, funcName) {
    queriedPath = path.resolve(pathToProcess);
    rootPath = process.cwd();
    ({ screen, spinner } = initScreenForUnitTests());

    await traverseDirectory(rootPath, true);  // first pass: collect all function names and codes
    await traverseDirectory(rootPath, true);  // second pass: collect all related functions
    await traverseDirectory(queriedPath, false, undefined, funcName);  // second pass: print functions and their related functions

    screen.destroy();
    if (testsGenerated === 0) {
        console.log(`${bold+red}No tests generated${funcName ? ' - can\'t find a function named "' + funcName + '"' : ''}!${reset}`);
    } else {
        console.log(`${bold+green}${testsGenerated} unit tests generated!${reset}`);
    }
    process.exit(0);
}

module.exports = {
    getFunctionsForExport,
    generateTestsForDirectory
}
