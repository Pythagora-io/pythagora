const path = require("path");
const babelParser = require("@babel/parser");
const {default: babelTraverse} = require("@babel/traverse");
const {default: generator} = require("@babel/generator");
const {getRelativePath} = require("./files");
const fs = require("fs").promises;


function replaceRequirePaths(code, currentPath, testFilePath) {
    const requirePathRegex = /require\((['"`])(.+?)\1\)/g;

    return code.replace(requirePathRegex, (match, quote, requirePath) => {
        if (!requirePath.startsWith('./') && !requirePath.startsWith('../')) return match;

        const absoluteRequirePath = path.resolve(currentPath, requirePath);

        const newRequirePath = getRelativePath(absoluteRequirePath, testFilePath);

        return `require(${quote}${newRequirePath}${quote})`;
    });
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

function insideFunctionOrMethod(nodeTypesStack) {
    return nodeTypesStack.slice(0, -1).some(type => /^(FunctionDeclaration|FunctionExpression|ArrowFunctionExpression|ClassMethod)$/.test(type));
}

function getRelatedFunctions(node, ast, filePath, functionList) {
    let relatedFunctions = [];
    let requiresFromFile = collectTopRequires(ast);

    function processNodeRecursively(node) {
        if (node.type === 'CallExpression') {
            let funcName;
            let callee = node.callee;

            while (callee.type === 'MemberExpression') {
                callee = callee.object;
            }

            if (callee.type === 'Identifier') {
                funcName = callee.name;
            } else if (callee.type === 'MemberExpression') {
                funcName = callee.property.name;
                if (callee.object.type === 'Identifier') {
                    funcName = callee.object.name + '.' + funcName;
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

async function stripUnrelatedFunctions(filePath, targetFuncNames) {
    const ast = await getAstFromFilePath(filePath);

    // Store the node paths of unrelated functions and class methods
    const unrelatedNodes = [];

    processAst(ast, (funcName, path, type) => {
        if (!targetFuncNames.includes(funcName) && type !== 'exportFn' && type !== 'exportObj') {
            // If the function is being used as a property value, remove the property instead of the function
            if (path.parentPath.isObjectProperty()) {
                unrelatedNodes.push(path.parentPath);
            } else {
                unrelatedNodes.push(path);
            }
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
                        // When module.exports is set to a single function
                        if (expression.right.type === 'Identifier') {
                            return cb(expression.right.name, null, 'exportFn');
                        }
                        // When module.exports is set to an object containing multiple functions
                        else if (expression.right.type === 'ObjectExpression') {
                            expression.right.properties.forEach(prop => {
                                if (prop.type === 'ObjectProperty') {
                                    return cb(prop.key.name, null, 'exportObj');
                                }
                            });
                        }
                    }
                }
            }

            // Handle ES6 export statements
            if (path.isExportDefaultDeclaration()) {
                if (path.node.declaration.type === 'FunctionDeclaration') {
                    return cb(path.node.declaration.id.name, null, 'export');
                } else if (path.node.declaration.type === 'Identifier') {
                    return cb(path.node.declaration.name, null, 'export');
                }
            } else if (path.isExportNamedDeclaration()) {
                if (path.node.declaration.type === 'FunctionDeclaration') {
                    return cb(path.node.declaration.id.name, null, 'export');
                } else if (path.node.specifiers.length > 0) {
                    path.node.specifiers.forEach(spec => {
                        return cb(spec.exported.name, null, 'export');
                    });
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
                } else if (path.parentPath.node.type === 'ClassBody') {
                    const className = path.parentPath.parentPath.node.id.name || '';
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

module.exports = {
    replaceRequirePaths,
    getAstFromFilePath,
    collectTopRequires,
    insideFunctionOrMethod,
    getRelatedFunctions,
    stripUnrelatedFunctions,
    processAst
}
