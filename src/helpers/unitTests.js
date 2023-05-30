const fs = require('fs').promises;
const path = require('path');
const _ = require('lodash');
const { getUnitTests } = require('./api');
const babelParser = require("@babel/parser");
const {PYTHAGORA_UNIT_DIR} = require("../const/common");
const babelTraverse = require("@babel/traverse").default;
const generator = require("@babel/generator").default;
const blessed = require('blessed');
const {delay} = require("../utils/common");
const Spinner = require("../utils/Spinner");

const directoryPath = process.argv[2];

if (!directoryPath) {
    console.log('Please provide a directory path');
    process.exit(1);
}

let functionList = {},
    leftPanel,
    rightPanel,
    screen,
    scrollableContent,
    spinner;

const insideFunctionOrMethod = (nodeTypesStack) =>
    nodeTypesStack.slice(0, -1).some(type => /^(FunctionDeclaration|FunctionExpression|ArrowFunctionExpression|ClassMethod)$/.test(type));

async function stripUnrelatedFunctions(filePath, targetFuncNames) {
    const ast = await getAstFromFilePath(filePath);

    // Store the node paths of unrelated functions and class methods
    const unrelatedNodes = [];

    processAst(ast, (funcName, path) => {
        if (!targetFuncNames.includes(funcName)) {
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
            if (!requiredPath) return;

            requiredPath = (requiredPath.match(/require\((['"`])(.*?)\1\)/) || [])[2];
            if (requiredPath && requiredPath.startsWith('./')) requiredPath = path.resolve(filePath.substring(0, filePath.lastIndexOf('/')), requiredPath);
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
        let ast = await getAstFromFilePath(filePath);
        processAst(ast, (funcName, path) => {
            functionList[filePath + ':' + funcName] = {
                code: generator(path.node).code,
                filePath: filePath,
                relatedFunctions: getRelatedFunctions(path.node, ast, filePath)
            };
        });
    } catch (e) {
        writeLine(`Error parsing file ${filePath}: ${e}`);
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

            let funcName;
            if (path.isFunctionDeclaration()) {
                funcName = path.node.id.name;
            } else if (path.isFunctionExpression() || path.isArrowFunctionExpression()) {
                if (path.parentPath.isVariableDeclarator()) {
                    funcName = path.parentPath.node.id.name;
                } else if (path.parentPath.isAssignmentExpression() || path.parentPath.isObjectProperty()) {
                    funcName = path.parentPath.node.left ? path.parentPath.node.left.name : path.parentPath.node.key.name;
                }
            } else if (path.node.type === 'ClassMethod' && path.node.key.name !== 'constructor') { // Add this block to handle class methods
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
            nodeTypesStack.pop();  // Add this line
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

async function printFunctions(filePath, prefix) {
    try {
        let ast = await getAstFromFilePath(filePath);
        const topRequires = collectTopRequires(ast);

        const foundFunctions = [];

        processAst(ast, (funcName, path) => {
            let functionFromTheList = functionList[filePath + ':' + funcName];
            foundFunctions.push({
                functionName: funcName,
                functionCode: functionFromTheList.code,
                relatedCode: functionFromTheList.relatedFunctions
            });
        });

        for (const funcData of foundFunctions) {
            let isLast = foundFunctions.indexOf(funcData) === foundFunctions.length - 1;
            spinner.start(`${prefix}${isLast ? '└───' : '├───'}${funcData.functionName}`);

            let formattedData = await reformatDataForPythagoraAPI(funcData, filePath);
            await getUnitTests(formattedData, (content) => {
                scrollableContent.setContent(content);
                scrollableContent.setScrollPerc(100);
                screen.render();
            });
            spinner.stop();
            await delay(100);
        }

    } catch (e) {
        writeLine(`Error parsing file ${filePath}: ${e}`);
    }
}

async function traverseDirectory(directory, isPrint, prefix = '') {
    const files = await fs.readdir(directory);
    for (const file of files) {
        const absolutePath = path.join(directory, file);
        const stat = await fs.stat(absolutePath);
        const isLast = files.indexOf(file) === files.length - 1;
        if (stat.isDirectory()) {
            if (isPrint) {
                writeLine(`${prefix}${isLast ? '└───' : '├───'}${path.basename(absolutePath)}`);
            }

            if (path.basename(absolutePath) !== 'node_modules') {
                const newPrefix = isLast ? `${prefix}    ` : `${prefix}|   `;
                await traverseDirectory(absolutePath, isPrint, newPrefix);
            }
        } else {
            if (path.extname(absolutePath) !== '.js') continue;
            if (isPrint) {
                writeLine(`${prefix}${isLast ? '└───' : '├───'}${path.basename(absolutePath)}`);
                const newPrefix = isLast ? `${prefix}    ` : `${prefix}|   `;
                await printFunctions(absolutePath, newPrefix);
            } else {
                await processFile(absolutePath);
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

function writeLine(line) {
    leftPanel.pushLine(line);
    leftPanel.setScrollPerc(100);
    screen.render(line);
}

initScreen();
traverseDirectory(directoryPath, false)  // first pass: collect all function names and codes
    .then(() => traverseDirectory(directoryPath, false))  // second pass: collect all related functions
    .then(() => traverseDirectory(directoryPath, true))  // second pass: print functions and their related functions
    .catch(err => console.error(err));
