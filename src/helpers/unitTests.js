const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const API = require('./api');
const {PYTHAGORA_UNIT_DIR} = require("../const/common");
const generator = require("@babel/generator").default;
const {checkDirectoryExists} = require("../utils/common");
const {
    stripUnrelatedFunctions,
    replaceRequirePaths,
    getAstFromFilePath,
    processAst,
    getRelatedFunctions,
    getModuleTypeFromFilePath
} = require("../utils/code");
const {getRelativePath, getFolderTreeItem, getTestFolderPath, checkPathType, isPathInside, calculateDepth} = require("../utils/files");
const {initScreenForUnitTests} = require("./cmdGUI");
const {green, red, blue, bold, reset} = require('../utils/cmdPrint').colors;

let functionList = {},
    screen,
    scrollableContent,
    spinner,
    rootPath = '',
    queriedPath = '',
    folderStructureTree = [],
    testsGenerated = [],
    skippedFiles = [],
    errors = [],
    filesToProcess = [],
    processedFiles = [],
    ignoreFolders = ['node_modules', 'pythagora_tests', '__tests__'],
    ignoreFilesEndingWith = [".test.js", ".test.ts", ".test.tsx"],
    processExtensions = ['.js', '.ts', '.tsx'],
    ignoreErrors = ['BABEL_PARSER_SYNTAX_ERROR'],
    force,
    isFileToIgnore = (fileName) => {
        return ignoreFilesEndingWith.some(ending => fileName.endsWith(ending))
    }
;

function resolveFilePath(filePath, extension) {
    if (fs.existsSync(filePath)) {
        return filePath;
    }

    const filePathWithExtension = `${filePath}${extension}`;
    if (fs.existsSync(filePathWithExtension)) {
        return filePathWithExtension;
    }

    return undefined;
}

async function processFile(filePath, filesToProcess) {
    try {
        let exportsFn = [];
        let exportsObj = [];
        let functions = [];
        let ast = await getAstFromFilePath(filePath);
        let syntaxType = await getModuleTypeFromFilePath(ast);
        let extension = path.extname(filePath);

        // Analyze dependencies
        ast.program.body.forEach(node => {
            if (node.type === "ImportDeclaration") {
                let importedFile = path.resolve(path.dirname(filePath), node.source.value);
                importedFile = resolveFilePath(importedFile, extension);
                if (importedFile && !filesToProcess.includes(importedFile)) {
                    filesToProcess.push(importedFile);
                }
            } else if (node.type === "VariableDeclaration" && node.declarations.length > 0 && node.declarations[0].init && node.declarations[0].init.type === "CallExpression" && node.declarations[0].init.callee.name === "require") {
                let importedFile = path.resolve(path.dirname(filePath), node.declarations[0].init.arguments[0].value);
                importedFile = resolveFilePath(importedFile, extension);
                if (importedFile && !filesToProcess.includes(importedFile)) {
                    filesToProcess.push(importedFile);
                }
            }
        });

        processAst(ast, (funcName, path, type) => {
            if (type === 'exportFn' || type === 'exportFnDef') {
                exportsFn.push(funcName);
            } else if (type === 'exportObj') {
                exportsObj.push(funcName);
            }

            if (!['exportFn', 'exportObj'].includes(type)) {
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
            let fileName = getRelativePath(file.fileName, path.dirname(filePath));
            let code = await stripUnrelatedFunctions(file.fileName, file.functionNames);
            let fullPath = filePath.substring(0, filePath.lastIndexOf('/')) + '/' + fileName;
            code = replaceRequirePaths(code, filePath, getTestFolderPath(filePath, rootPath));
            funcData.relatedCode.push({
                fileName,
                code,
                functionNames: file.functionNames,
                exportedAsObject: file.exportedAsObject,
                syntaxType: file.syntaxType,
                pathRelativeToTest: getRelativePath(fullPath, testFilePath)
            });
        }
    }
    funcData.functionCode = await stripUnrelatedFunctions(filePath, relatedCodeInSameFile);
    funcData.functionCode = replaceRequirePaths(funcData.functionCode, path.dirname(filePath), getTestFolderPath(filePath, rootPath));
    funcData.pathRelativeToTest = getRelativePath(filePath, testFilePath);
    return funcData;
}

async function createTests(filePath, funcToTest, processingFunction = 'getUnitTests') {
    try {
        let extension = path.extname(filePath);
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

        const uniqueFoundFunctions = foundFunctions.filter((item, index, self) =>
                index === self.findIndex((t) => (
                    t.functionName === item.functionName && t.functionCode === item.functionCode
                ))
        );

        sortFolderTree();

        for (const [i, funcData] of uniqueFoundFunctions.entries()) {
            let indexToPush = fileIndex + 1 + i;
            let prefix = folderStructureTree[fileIndex].line.split(path.basename(folderStructureTree[fileIndex].absolutePath))[0];
            folderStructureTree.splice(
                indexToPush,
                0,
                {
                    line: " ".repeat(prefix.length) + "└───" + funcData.functionName,
                    absolutePath: filePath + ':' + funcData.functionName
                }
            );
            spinner.start(folderStructureTree, indexToPush);

            let testFilePath = path.join(getTestFolderPath(filePath, rootPath), `/${funcData.functionName}.test${extension}`);
            if (fs.existsSync(testFilePath) && !force) {
                skippedFiles.push(testFilePath);
                await spinner.stop();
                folderStructureTree[indexToPush].line = `${green}${folderStructureTree[indexToPush].line}${reset}`;
                continue;
            }

            let formattedData = await reformatDataForPythagoraAPI(funcData, filePath, getTestFolderPath(filePath, rootPath));
            let { tests, error } = await API[processingFunction](formattedData, (content) => {
                scrollableContent.setContent(content);
                scrollableContent.setScrollPerc(100);
                screen.render();
            });

            if (tests) {
                let testPath = await saveTests(filePath, funcData.functionName, tests);
                testsGenerated.push(testPath);
                await spinner.stop();
                folderStructureTree[indexToPush].line = `${green}${folderStructureTree[indexToPush].line}${reset}`;
            } else if (error) {
                errors.push({
                    file:filePath,
                    function: funcData.functionName,
                    error: { stack: error.stack, message: error.message }
                });
                await spinner.stop();
                folderStructureTree[indexToPush].line = `${red}${folderStructureTree[indexToPush].line}${reset}`;
            }
        }

        if (uniqueFoundFunctions.length > 0) {
            folderStructureTree[fileIndex].line = `${green+bold}${folderStructureTree[fileIndex].line}${reset}`;
        }

    } catch (e) {
        if (!ignoreErrors.includes(e.code)) errors.push(e.stack);
    }
}

async function saveTests(filePath, name, testData) {
    let dir = getTestFolderPath(filePath, rootPath);
    let extension = path.extname(filePath);

    if (!await checkDirectoryExists(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    let testPath = path.join(dir, `/${name}.test${extension}`);
    fs.writeFileSync(testPath, testData);
    return testPath;
}

async function traverseDirectory(file, onlyCollectFunctionData, funcName, processingFunction) {
    if (processedFiles.includes(file)) {
        return;
    }
    processedFiles.push(file);

    if (await checkPathType(file) === 'file' && !onlyCollectFunctionData) {
        if (!processExtensions.includes(path.extname(file))) {
            throw new Error('File extension is not supported');
        }
        return await createTests(file, funcName, processingFunction);
    }

    const absolutePath = path.resolve(file);
    const stat = fs.statSync(absolutePath);

    if (!stat.isDirectory() && isFileToIgnore(file)) return;

    if (stat.isDirectory()) {
        if (ignoreFolders.includes(path.basename(absolutePath)) || path.basename(absolutePath).charAt(0) === '.') return;

        if (onlyCollectFunctionData && isPathInside(path.dirname(queriedPath), absolutePath)) {
            updateFolderTree(absolutePath);
        }

        const directoryFiles = fs.readdirSync(absolutePath)
            .filter(f => {
                const absoluteFilePath = path.join(absolutePath, f);
                const fileStat = fs.statSync(absoluteFilePath);
                if (fileStat.isDirectory()) {
                    const baseName = path.basename(absoluteFilePath);
                    return !ignoreFolders.includes(baseName) && !baseName.startsWith('.');
                } else {
                    const ext = path.extname(f);
                    return processExtensions.includes(ext) && !isFileToIgnore(f);
                }
            })
            .map(f => path.join(absolutePath, f));
        filesToProcess.push(...directoryFiles);


    } else {
        if (!processExtensions.includes(path.extname(absolutePath))) return;

        if (onlyCollectFunctionData) {
            if (isPathInside(path.dirname(queriedPath), absolutePath)) {
                updateFolderTree(absolutePath);
            }
            await processFile(absolutePath, filesToProcess);
        } else {
            await createTests(absolutePath, funcName, processingFunction);
        }
    }

    while (filesToProcess.length > 0) {
        const nextFile = filesToProcess.shift();
        if (processedFiles.includes(nextFile)) {
            continue; // Skip processing if it has already been processed
        }
        await traverseDirectory(nextFile, onlyCollectFunctionData, funcName, processingFunction);
    }
}

function updateFolderTree(absolutePath) {
    if (isPathInside(queriedPath, absolutePath) && !folderStructureTree.find(fst => fst.absolutePath === absolutePath)) {
        let depth = calculateDepth(queriedPath, absolutePath);
        let prefix = '';
        for (let i = 1; i < depth; i++) {
            prefix += '|    ';
        }
        folderStructureTree.push(getFolderTreeItem(prefix + "├───", absolutePath));
    }
}

function sortFolderTree() {
    // 1. Sort the folderStructureTree
    folderStructureTree.sort((a, b) => {
        if (a.absolutePath < b.absolutePath) {
            return -1;
        }
        if (a.absolutePath > b.absolutePath) {
            return 1;
        }
        return 0;
    });

    // 2. Set prefix according to the position in the directory
    for (let i = 0; i < folderStructureTree.length; i++) {
        // Get the current directory path
        const currentDirPath = path.dirname(folderStructureTree[i].absolutePath);
        // Check if it's the last file in the directory
        if (i === folderStructureTree.length - 1 || path.dirname(folderStructureTree[i + 1].absolutePath) !== currentDirPath) {
            // Update the prefix for the last file in the directory
            folderStructureTree[i].line = folderStructureTree[i].line.replace("├───", "└───");
        }
    }
}

function sortFolderTree() {
    // 1. Sort the folderStructureTree
    folderStructureTree.sort((a, b) => {
        if (a.absolutePath < b.absolutePath) {
            return -1;
        }
        if (a.absolutePath > b.absolutePath) {
            return 1;
        }
        return 0;
    });

    // 2. Set prefix according to the position in the directory
    for (let i = 0; i < folderStructureTree.length; i++) {
        // Get the current directory path
        const currentDirPath = path.dirname(folderStructureTree[i].absolutePath);
        // Check if it's the last file in the directory
        if (i === folderStructureTree.length - 1 || path.dirname(folderStructureTree[i + 1].absolutePath) !== currentDirPath) {
            // Update the prefix for the last file in the directory
            folderStructureTree[i].line = folderStructureTree[i].line.replace("├───", "└───");
        }
    }
}

async function getFunctionsForExport(dirPath, ignoreFilesRewrite) {
    if (ignoreFilesRewrite) {
        isFileToIgnore = ignoreFilesRewrite;
    }
    rootPath = dirPath;
    await traverseDirectory(rootPath, true);
    processedFiles = [];
    await traverseDirectory(rootPath, true);
    return {functionList, folderStructureTree};
}

async function generateTestsForDirectory(args, processingFunction = 'getUnitTests') {
    let pathToProcess = args.path,
        funcName = args.func;
    force = args.force;

    API.checkForAPIKey();
    queriedPath = path.resolve(pathToProcess);
    rootPath = args.pythagora_root;
    console.log('Processing folder structure...');

    await traverseDirectory(queriedPath, true, funcName, processingFunction);
    processedFiles = [];
    await traverseDirectory(queriedPath, true, funcName, processingFunction);
    processedFiles = [];
    console.log('Generating tests...');
    ({ screen, spinner, scrollableContent } = initScreenForUnitTests());
    await traverseDirectory(queriedPath, false, funcName, processingFunction);

    screen.destroy();
    process.stdout.write('\x1B[2J\x1B[0f');
    if (errors.length) {
        let errLogPath = `${path.resolve(PYTHAGORA_UNIT_DIR, 'errorLogs.log')}`;
        fs.writeFileSync(errLogPath, JSON.stringify(errors, null, 2));
        console.error('There were errors encountered while trying to generate unit tests.\n');
        console.error(`You can find logs here: ${errLogPath}`);
    }
    if (skippedFiles.length) console.log(`${bold}Generation of ${skippedFiles.length} test suites were skipped because tests already exist. If you want to override them add "--force" flag to command${reset}`);
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
