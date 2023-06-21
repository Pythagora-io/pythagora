const fs = require('fs');
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
    errors = [],
    ignoreFolders = ['node_modules', 'pythagora_tests'],
    processExtensions = ['.js'],
    ignoreErrors = ['BABEL_PARSER_SYNTAX_ERROR'],
    force
;

async function processFile(filePath) {
    try {
        let exportsFn = [];
        let exportsObj = [];
        let functions = [];
        let ast = await getAstFromFilePath(filePath);
        let syntaxType = await getModuleTypeFromFilePath(ast);
        processAst(ast, (funcName, path, type) => {
            if (type === 'exportFnDef') {
                exportsFn.push(funcName);
            } else if (type === 'exportFn') {
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
    // TODO add check if there are more functionNames than 1 while exportedAsObject is true - this shouldn't happen ever
    relatedCode = _.map(relatedCode, (value, key)  => {
        return {
            fileName: key,
            functionNames: value.map(item => item.funcName),
            exportedAsObject: value[0].exportedAsObject,
            syntaxType: value[0].syntaxType
        }
    });
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
                functionNames: file.functionNames,
                exportedAsObject: file.exportedAsObject,
                syntaxType: file.syntaxType,
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

            let testFilePath = path.join(getTestFilePath(filePath, rootPath), `/${funcData.functionName}.test.js`);
            if (fs.existsSync(testFilePath) && !force) {
                await spinner.stop();
                folderStructureTree[indexToPush].line = `${green}${folderStructureTree[indexToPush].line}${reset}`;
                continue;
            }

            let formattedData = await reformatDataForPythagoraAPI(funcData, filePath, getTestFilePath(filePath, rootPath));
            let { tests, error } = await getUnitTests(formattedData, (content) => {
                scrollableContent.setContent(content);
                scrollableContent.setScrollPerc(100);
                screen.render();
            });

            if (tests) {
                let testPath = await saveTests(filePath, funcData.functionName, tests);
                testsGenerated.push(testPath);
                await spinner.stop();
                folderStructureTree[indexToPush].line = `${green}${folderStructureTree[indexToPush].line}${reset}`;
            } else {
                errors.push({
                    file:filePath,
                    function: funcData.functionName,
                    error
                });
                await spinner.stop();
                folderStructureTree[indexToPush].line = `${red}${folderStructureTree[indexToPush].line}${reset}`;
            }
        }

        if (foundFunctions.length > 0) {
            folderStructureTree[fileIndex].line = `${green+bold}${folderStructureTree[fileIndex].line}${reset}`;
        }

    } catch (e) {
        if (!ignoreErrors.includes(e.code)) errors.push(e);
    }
}

async function saveTests(filePath, name, testData) {
    let dir = getTestFilePath(filePath, rootPath);

    if (!await checkDirectoryExists(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    let testPath = path.join(dir, `/${name}.test.js`);
    fs.writeFileSync(testPath, testData);
    return testPath;
}

async function traverseDirectory(directory, onlyCollectFunctionData, prefix = '', funcName) {
    if (await checkPathType(directory) === 'file' && !onlyCollectFunctionData) {
        if (!processExtensions.includes(path.extname(directory))) throw new Error('File extension is not supported');
        const newPrefix = `|   ${prefix}|   `;
        return await createTests(directory, newPrefix, funcName);
    }
    const files = fs.readdirSync(directory);
    for (const file of files) {
        const absolutePath = path.join(directory, file);
        const stat = fs.statSync(absolutePath);
        const isLast = files.indexOf(file) === files.length - 1;
        if (stat.isDirectory()) {
            if (ignoreFolders.includes(path.basename(absolutePath))  || path.basename(absolutePath).charAt(0) === '.') continue;

            if (onlyCollectFunctionData && isPathInside(path.dirname(queriedPath), absolutePath)) {
                updateFolderTree(prefix, isLast, absolutePath)
            }

            const newPrefix = isLast ? `${prefix}    ` : `${prefix}|   `;
            await traverseDirectory(absolutePath, onlyCollectFunctionData, newPrefix, funcName);
        } else {
            if (!processExtensions.includes(path.extname(absolutePath))) continue;
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

async function generateTestsForDirectory(args) {
    let pathToProcess = args.path,
        funcName = args.func;
    force = args.force;

    checkForAPIKey();
    queriedPath = path.resolve(pathToProcess);
    rootPath = process.cwd();
    ({ screen, spinner, scrollableContent } = initScreenForUnitTests());

    await traverseDirectory(rootPath, true);  // first pass: collect all function names and codes
    await traverseDirectory(rootPath, true);  // second pass: collect all related functions
    await traverseDirectory(queriedPath, false, undefined, funcName);  // second pass: print functions and their related functions

    screen.destroy();
    process.stdout.write('\x1B[2J\x1B[0f');
    if (errors.length) {
        let errLogPath = `${path.resolve(PYTHAGORA_UNIT_DIR, 'errorLogs.log')}`
        fs.writeFileSync(errLogPath, JSON.stringify(errors));
        console.error('There were errors encountered while trying to generate unit tests.\n');
        console.error(`You can find logs here: ${errLogPath}`);
    }
    if (testsGenerated.length === 0) {
        console.log(`${bold+red}No tests generated!${reset}`);
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
