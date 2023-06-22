const path = require("path");
const babelParser = require("@babel/parser");
const {default: babelTraverse} = require("@babel/traverse");
const {default: generator} = require("@babel/generator");
const {getRelativePath} = require("./files");
const fs = require("fs").promises;
const _ = require("lodash");


function replaceRequirePaths(code, currentPath, testFilePath) {
    const importRequirePathRegex = /(require\((['"`])(.+?)\2\))|(import\s+.*?\s+from\s+(['"`])(.+?)\5)/g;

    return code.replace(importRequirePathRegex, (match, requireExp, requireQuote, requirePath, importExp, importQuote, importPath) => {
        let quote, modulePath;

        if (requireExp) {
            quote = requireQuote;
            modulePath = requirePath;
        } else if (importExp) {
            quote = importQuote;
            modulePath = importPath;
        }

        if (!modulePath.startsWith('./') && !modulePath.startsWith('../')) return match;

        const absoluteRequirePath = path.resolve(currentPath, modulePath);

        const newRequirePath = getRelativePath(absoluteRequirePath, testFilePath);

        if (requireExp) {
            return `require(${quote}${newRequirePath}${quote})`;
        } else if (importExp) {
            return `${importExp.split('from')[0].trim()} from ${quote}${newRequirePath}${quote}`;
        }
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

async function getModuleTypeFromFilePath(ast) {
    let moduleType = 'CommonJS';

    babelTraverse(ast, {
        ImportDeclaration(path) {
            moduleType = 'ES6';
            path.stop(); // Stop traversal when an ESM statement is found
        },
        ExportNamedDeclaration(path) {
            moduleType = 'ES6';
            path.stop(); // Stop traversal when an ESM statement is found
        },
        ExportDefaultDeclaration(path) {
            moduleType = 'ES6';
            path.stop(); // Stop traversal when an ESM statement is found
        },
        CallExpression(path) {
            if (path.node.callee.name === 'require') {
                moduleType = 'CommonJS';
                path.stop(); // Stop traversal when a CommonJS statement is found
            }
        },
        AssignmentExpression(path) {
            if (path.node.left.type === 'MemberExpression' && path.node.left.object.name === 'module' && path.node.left.property.name === 'exports') {
                moduleType = 'CommonJS';
                path.stop(); // Stop traversal when a CommonJS statement is found
            }
        }
    });

    return moduleType;
}


function collectTopRequires(node) {
    let requires = [];
    babelTraverse(node, {
        VariableDeclaration(path) {
            if (path.node.declarations[0].init && path.node.declarations[0].init.callee && path.node.declarations[0].init.callee.name === 'require') {
                requires.push(generator(path.node).code);
            }
        },
        ImportDeclaration(path) {
            requires.push(generator(path.node).code);
        }
    });
    return requires;
}

function insideFunctionOrMethod(nodeTypesStack) {
    return nodeTypesStack.slice(0, -1).some(type => /^(FunctionDeclaration|FunctionExpression|ArrowFunctionExpression|ClassMethod)$/.test(type));
}

function getPathFromRequireOrImport(path) {
    return (path.match(/require\((['"`])(.*?)\1\)|import\s+.*?\s+from\s+(['"`])(.*?)\3/) || [])[2] ||
        (path.match(/require\((['"`])(.*?)\1\)|import\s+.*?\s+from\s+(['"`])(.*?)\3/) || [])[4];
}

function getFullPathFromRequireOrImport(importPath, filePath) {
    if (importPath && (importPath.startsWith('./') || importPath.startsWith('../'))) importPath = path.resolve(filePath.substring(0, filePath.lastIndexOf('/')), importPath);
    if (importPath.lastIndexOf('.js') + '.js'.length !== importPath.length) importPath += '.js';
    return importPath;
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
                requiredPath = getPathFromRequireOrImport(requiredPath);
                requiredPath = getFullPathFromRequireOrImport(requiredPath, filePath);
            }
            let functionFromList = functionList[requiredPath + ':' + funcName];
            if (functionFromList) {
                relatedFunctions.push(_.extend(functionFromList, {
                    fileName: requiredPath
                }));
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
                    if (left.object.type === 'MemberExpression' &&
                        left.object.object.name === 'module' &&
                        left.object.property.name === 'exports') {
                        if (expression.right.type === 'Identifier') {
                            // module.exports.func1 = func1
                            return cb(left.property.name, null, 'exportObj');
                        } else if (expression.right.type === 'FunctionExpression') {
                            // module.exports.funcName = function() { ... }
                            // module.exports = function() { ... }
                            const loc = path.node.loc.start;
                            let funcName = (left.property.name) || `anon_func_${loc.line}_${loc.column}`;
                            return cb(funcName, path, 'exportObj');
                        }
                    } else if (left.type === 'MemberExpression' &&
                        left.object.name === 'module' &&
                        left.property.name === 'exports') {
                        if (expression.right.type === 'Identifier') {
                            // module.exports = func1
                            return cb(expression.right.name, null, 'exportFn');
                        } else if (expression.right.type === 'FunctionExpression') {
                            let funcName;
                            if (expression.right.id) {
                                // module.exports = function func1() { ... }
                                funcName = expression.right.id.name;
                            } else {
                                // module.exports = function() { ... }
                                const loc = path.node.loc.start;
                                funcName = `anon_func_${loc.line}_${loc.column}`;
                            }
                            return cb(funcName, path, 'exportFnDef');
                        } else if (expression.right.type === 'ObjectExpression') {
                            expression.right.properties.forEach(prop => {
                                if (prop.type === 'ObjectProperty') {
                                    // module.exports = { func1 };
                                    return cb(prop.key.name, null, 'exportObj');
                                }
                            });
                        }
                    }
                    // Handle TypeScript transpiled exports
                    else if (left.type === 'MemberExpression' &&
                        left.object.name === 'exports') {
                        // exports.func1 = function() { ... }
                        // exports.func1 = func1
                        return cb(left.property.name, null, 'exportObj');
                    }
                }
            }

            // Handle ES6 export statements
            if (path.isExportDefaultDeclaration()) {
                const declaration = path.node.declaration;
                if (declaration.type === 'FunctionDeclaration' || declaration.type === 'Identifier') {
                    // export default func1;
                    // TODO export default function() { ... }
                    // TODO cover anonimous functions - add "anon_" name
                    return cb(declaration.id ? declaration.id.name : declaration.name, null, 'exportFn');
                } else if (declaration.type === 'ObjectExpression') {
                    declaration.properties.forEach(prop => {
                        if (prop.type === 'ObjectProperty') {
                            // export default { func1: func }
                            // export default { func1 }
                            return cb(prop.key.name, null, 'exportObj');
                        }
                    });
                } else if (declaration.type === 'ClassDeclaration') {
                    // export default class Class1 { ... }
                    return cb(declaration.id ? declaration.id.name : declaration.name, null, 'exportFnDef');
                }
            } else if (path.isExportNamedDeclaration()) {
                if (path.node.declaration) {
                    if (path.node.declaration.type === 'FunctionDeclaration') {
                        // export function func1 () { ... }
                        // export class Class1 () { ... }
                        return cb(path.node.declaration.id.name, null, 'exportFnDef');
                    } else if (path.node.declaration.type === 'VariableDeclaration') {
                        path.node.declaration.declarations.forEach(declaration => {
                            return cb(declaration.id.name, null, 'exportFn');
                        });
                    } else if (path.node.declaration.type === 'ClassDeclaration') {
                        // export class Class1 { ... }
                        return cb(path.node.declaration.id.name, null, 'exportFnDef');
                    }
                } else if (path.node.specifiers.length > 0) {
                    path.node.specifiers.forEach(spec => {
                        // export { func as func1 }
                        return cb(spec.exported.name, null, 'exportObj');
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
                    // TODO: Handle classes that are not declared as a variable
                    const className = path.parentPath.parentPath.node.id ? path.parentPath.parentPath.node.id.name : '';
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
    processAst,
    getModuleTypeFromFilePath
}
