const fs = require('fs').promises;
const path = require('path');
const _ = require('lodash');
const { getUnitTests } = require('./api');
const babelParser = require("@babel/parser");
const {PYTHAGORA_UNIT_DIR} = require("../const/common");
const babelTraverse = require("@babel/traverse").default;
const generator = require("@babel/generator").default;
const blessed = require('blessed');
const {delay, checkDirectoryExists} = require("../utils/common");
const Spinner = require("../utils/Spinner");
const {green, bold, reset} = require('../utils/CmdPrint').colors;

let functionList = {},
    leftPanel,
    rightPanel,
    screen,
    scrollableContent,
    spinner,
    folderStructureTree = [];

const insideFunctionOrMethod = (nodeTypesStack) =>
    nodeTypesStack.slice(0, -1).some(type => /^(FunctionDeclaration|FunctionExpression|ArrowFunctionExpression|ClassMethod)$/.test(type));

async function stripUnrelatedFunctions(filePath, targetFuncNames) {
    const ast = await getAstFromFilePath(filePath);

    // Store the node paths of unrelated functions and class methods
    const unrelatedNodes = [];

    processAst(ast, (funcName, path, type) => {
        if (!targetFuncNames.includes(funcName) && type !== 'export') {
            unrelatedNodes.push(path);
        }
    });

    // Remove unrelated nodes from the AST
    for (const path of unrelatedNodes) {
        path.remove();
    }

    // Generate the stripped code from the modified AST
    const strippedCode = generator(ast).code;

    return strippedCode;
}

function getRelatedFunctions(node, ast, filePath) {
    let relatedFunctions = [];
    let requiresFromFile = collectTopRequires(ast);

    function processNodeRecursively(node) {
        if (node.type === 'CallExpression') {
            let funcName;
            if (node.callee.type === 'Identifier') {
                funcName = node.callee.name;
            } else if (node.callee.type === 'MemberExpression') {
                funcName = node.callee.property.name;
                if (node.callee.object.type === 'Identifier') {
                    funcName = node.callee.object.name + '.' + funcName;
                }
            }

            let requiredPath = requiresFromFile.find(require => require.includes(funcName));
            if (!requiredPath) {
                requiredPath = filePath;
            } else {
                requiredPath = (requiredPath.match(/require\((['"`])(.*?)\1\)/) || [])[2];
                if (requiredPath && (requiredPath.startsWith('./') || requiredPath.startsWith('../'))) requiredPath = path.resolve(filePath.substring(0, filePath.lastIndexOf('/')), requiredPath);
                if (requiredPath.lastIndexOf('.js') + '.js'.length !== requiredPath.length) requiredPath += '.js';
            }
            let functionFromList = functionList[requiredPath + ':' + funcName];
            if (functionFromList) {
                relatedFunctions.push({
                    fileName: requiredPath,
                    funcName
                });
            }
        }

        // Traverse child nodes
        for (const key in node) {
            const prop = node[key];
            if (Array.isArray(prop)) {
                for (const child of prop) {
                    if (typeof child === 'object' && child !== null) {
                        processNodeRecursively(child);
                    }
                }
            } else if (typeof prop === 'object' && prop !== null) {
                processNodeRecursively(prop);
            }
        }
    }

    processNodeRecursively(node);
    return relatedFunctions;
}

function collectTopRequires(node) {
    let requires = [];
    babelTraverse(node, {
        VariableDeclaration(path) {
            if (path.node.declarations[0].init && path.node.declarations[0].init.callee && path.node.declarations[0].init.callee.name === 'require') {
                requires.push(generator(path.node).code);
            }
        }
    });
    return requires;
}

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
                    relatedFunctions: getRelatedFunctions(path.node, ast, filePath)
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

async function getAstFromFilePath(filePath) {
    let data = await fs.readFile(filePath, 'utf8');
    let nodeTypesStack = [];
    // Remove shebang if it exists
    if (data.indexOf('#!') === 0) {
        data = '//' + data;
    }

    const ast = babelParser.parse(data, {
        sourceType: "module", // Consider input as ECMAScript module
        locations: true,
        plugins: ["jsx", "objectRestSpread"] // Enable JSX and object rest/spread syntax
    });

    return ast;
}

function processAst(ast, cb) {
    let nodeTypesStack = [];
    babelTraverse(ast, {
        enter(path) {
            nodeTypesStack.push(path.node.type);
            if (insideFunctionOrMethod(nodeTypesStack)) return;

            // Handle module.exports
            if (path.isExpressionStatement()) {
                const expression = path.node.expression;
                if (expression && expression.type === 'AssignmentExpression') {
                    const left = expression.left;
                    if (left.type === 'MemberExpression' &&
                        left.object.name === 'module' &&
                        left.property.name === 'exports') {
                        if (expression.right.type === 'ObjectExpression') {
                            expression.right.properties.forEach(prop => {
                                if (prop.type === 'ObjectProperty') {
                                    cb(prop.key.name, null, 'export');
                                }
                            });
                        }
                    }
                }
            }

            let funcName;
            if (path.isFunctionDeclaration()) {
                funcName = path.node.id.name;
            } else if (path.isFunctionExpression() || path.isArrowFunctionExpression()) {
                if (path.parentPath.isVariableDeclarator()) {
                    funcName = path.parentPath.node.id.name;
                } else if (path.parentPath.isAssignmentExpression() || path.parentPath.isObjectProperty()) {
                    funcName = path.parentPath.node.left ? path.parentPath.node.left.name : path.parentPath.node.key.name;
                }
            } else if (path.node.type === 'ClassMethod' && path.node.key.name !== 'constructor') {
                funcName = path.node.key.name;
                if (path.parentPath.node.type === 'ClassDeclaration') {
                    const className = path.parentPath.node.id.name;
                    funcName = `${className}.${funcName}`;
                } else if (path.parentPath.node.type === 'ClassExpression') {
                    const className = path.parentPath.node.id.name || '';
                    funcName = `${className}.${funcName}`;
                }
            }

            if (funcName) cb(funcName, path);
        },
        exit(path) {
            nodeTypesStack.pop();
        }
    });
}



function getRelativePath(filePath, referenceFilePath) {
    let relativePath = path.relative(path.dirname(referenceFilePath), filePath);
    if (!relativePath.startsWith('../') && !relativePath.startsWith('./')) {
        relativePath = './' + relativePath;
    }
    return relativePath;
}

async function reformatDataForPythagoraAPI(funcData, filePath) {
    let relatedCode = _.groupBy(funcData.relatedCode, 'fileName');
    relatedCode = _.map(relatedCode, (value, key) => ({ fileName: key, functionNames: value.map(item => item.funcName) }));
    funcData.relatedCode = [];
    for (const file of relatedCode) {
        let fileName = getRelativePath(file.fileName, filePath);
        let code = await stripUnrelatedFunctions(file.fileName, file.functionNames);
        code = replaceRequirePaths(code, filePath, path.resolve(PYTHAGORA_UNIT_DIR) + '/brija.test.js');
        funcData.relatedCode.push({ fileName, code });
    }
    funcData.functionCode = await stripUnrelatedFunctions(filePath, [funcData.functionName]);
    funcData.functionCode = replaceRequirePaths(funcData.functionCode, path.dirname(filePath), path.resolve(PYTHAGORA_UNIT_DIR) + '/brija.test.js');
    return funcData;
}

function replaceRequirePaths(code, currentPath, testFilePath) {
    const requirePathRegex = /require\((['"`])(.+?)\1\)/g;

    return code.replace(requirePathRegex, (match, quote, requirePath) => {
        if (!requirePath.startsWith('./') && !requirePath.startsWith('../')) return match;

        const absoluteRequirePath = path.resolve(currentPath, requirePath);

        const newRequirePath = getRelativePath(absoluteRequirePath, testFilePath);

        return `require(${quote}${newRequirePath}${quote})`;
    });
}

async function createTests(filePath, directoryPath, prefix) {
    try {
        let ast = await getAstFromFilePath(filePath);
        const topRequires = collectTopRequires(ast);
        const fileIndex = folderStructureTree.findIndex(item => item.absolutePath === filePath);

        const foundFunctions = [];

        processAst(ast, (funcName, path, type) => {
            if (type === 'export') return;
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

            let formattedData = await reformatDataForPythagoraAPI(funcData, filePath);
            let tests = await getUnitTests(formattedData, (content) => {
                scrollableContent.setContent(content);
                scrollableContent.setScrollPerc(100);
                screen.render();
            });
            await saveTests(filePath, funcData.functionName, tests, directoryPath);
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

function getFolderTreeItem(prefix, isLast, name, absolutePath) {
    return {
        line: `${prefix}${isLast ? '└───' : '├───'}${name}`,
        absolutePath
    };
}

async function saveTests(filePath, name, testData, directoryPath) {
    let dir = path.join(
        path.resolve(PYTHAGORA_UNIT_DIR),
        path.dirname(filePath).replace(directoryPath, ''),
        path.basename(filePath, path.extname(filePath))
    );

    if (!await checkDirectoryExists(dir)) {
        await fs.mkdir(dir, { recursive: true });
    }

    await fs.writeFile(path.join(dir, `/${name}.test.js`), testData);
}

async function traverseDirectory(directory, onlyCollectFunctionData, prefix = '') {
    const files = await fs.readdir(directory);
    for (const file of files) {
        const absolutePath = path.join(directory, file);
        const stat = await fs.stat(absolutePath);
        const isLast = files.indexOf(file) === files.length - 1;
        if (stat.isDirectory()) {
            if (onlyCollectFunctionData) {
                folderStructureTree.push(getFolderTreeItem(
                    prefix,
                    isLast,
                    path.basename(absolutePath),
                    absolutePath
                ));
            }

            if (path.basename(absolutePath) !== 'node_modules') {
                const newPrefix = isLast ? `${prefix}    ` : `${prefix}|   `;
                await traverseDirectory(absolutePath, onlyCollectFunctionData, newPrefix);
            }
        } else {
            if (path.extname(absolutePath) !== '.js') continue;
            if (onlyCollectFunctionData) {
                folderStructureTree.push(getFolderTreeItem(
                    prefix,
                    isLast,
                    path.basename(absolutePath),
                    absolutePath
                ));
                await processFile(absolutePath);
            } else {
                const newPrefix = isLast ? `${prefix}    ` : `${prefix}|   `;
                await createTests(absolutePath, directory, newPrefix);
            }
        }
    }
}

function initScreen() {
    screen = blessed.screen({
        smartCSR: true,
        fullUnicode: true,
    });

    leftPanel = blessed.box({
        width: '50%',
        height: '100%',
        border: { type: 'line' },
        scrollable: true,
        alwaysScroll: true,
        scrollbar: {
            ch: ' '
        },
        keys: true,
        vi: true
    });

    rightPanel = blessed.box({
        width: '50%',
        height: '100%',
        left: '50%',
        border: { type: 'line' }
    });

    scrollableContent = blessed.box({
        parent: rightPanel,
        scrollable: true,
        alwaysScroll: true,
        scrollbar: {
            ch: ' '
        },
        keys: true,
        vi: true
    });

    screen.append(leftPanel);
    screen.append(rightPanel);
    screen.render();
    screen.key(['C-c'], function () {
        return process.exit(0);
    });

    spinner = new Spinner(leftPanel, screen);
}

async function getFunctionsForExport(directoryPath) {
    await traverseDirectory(directoryPath, true);
    await traverseDirectory(directoryPath, true);
    return functionList;
}

function generateTestsForDirectory(directoryPath) {
    initScreen();
    traverseDirectory(directoryPath, true)  // first pass: collect all function names and codes
        .then(() => traverseDirectory(directoryPath, true))  // second pass: collect all related functions
        .then(() => traverseDirectory(directoryPath, false))  // second pass: print functions and their related functions
        .catch(err => console.error(err));
}

module.exports = {
    getFunctionsForExport,
    generateTestsForDirectory
}
