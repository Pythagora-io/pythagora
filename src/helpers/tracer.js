const fs = require('fs');
const path = require('path');
const falafel = require('falafel');
const Module = require('module');
const moduleCache = new Map();

function cleanInstrumentedCode(functionCode) {
    const logCodeRegex = /\/\*PYTHAGORA_START\*\/[\s\S]*?\/\*PYTHAGORA_END\*\//g;
    return functionCode.replace(logCodeRegex, '').trim();
}

function instrumentCode(code, baseDir) {
    return falafel(code, { locations: true, ecmaVersion: 11 }, (node) => {
        if (node.type === 'CallExpression' && node.callee.name === 'require' && node.arguments.length > 0) {
            const moduleName = node.arguments[0].value;
            try {
                const resolvedPath = require.resolve(moduleName, { paths: [baseDir] });
                node.arguments[0].update(`'${resolvedPath}'`);
            } catch (err) {
                // Ignore modules that can't be resolved
            }
        }

        if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
            const { line, column } = node.loc.start;
            const functionCode = node.source();
            const cleanedFunctionCode = cleanInstrumentedCode(functionCode);
            const escapedCleanedFunctionCode = JSON.stringify(cleanedFunctionCode);
            const logCode = `/*PYTHAGORA_START*/if (global.Pythagora && global.Pythagora.functionTriggered) { global.Pythagora.functionTriggered(${escapedCleanedFunctionCode}); }/*PYTHAGORA_END*/`;

            if (node.type === 'ArrowFunctionExpression' && node.expression) {
                const paramsSource = node.params.map(param => param.source()).join(', ');
                node.update(`(${paramsSource}) => {${logCode} return ${node.body.source()}}`);
            } else {
                node.body.update(`{${logCode}${node.body.source().slice(1, -1)}}`);
            }
        }
    }).toString();
}

function patchModuleLoad(targetFiles) {
    const originalLoad = Module._load;

    Module._load = function (request, parent, isMain) {
        const filePath = Module._resolveFilename(request, parent, isMain);

        if (targetFiles.includes(filePath)) {
            if (moduleCache.has(filePath)) {
                return moduleCache.get(filePath);
            }

            const baseDir = path.dirname(filePath);
            const originalCode = fs.readFileSync(filePath, 'utf-8');
            let instrumentedCode = instrumentCode(originalCode, baseDir);

            const patchedModule = new Module(filePath, parent);
            patchedModule._compile(instrumentedCode, filePath);

            moduleCache.set(filePath, patchedModule.exports);
            return patchedModule.exports;
        }

        return originalLoad.apply(this, arguments);
    };
}

function removeIndentation(code) {
    const lines = code.split('\n');
    const trimmedLines = lines.map(line => line.trim());
    let lastLine = trimmedLines[trimmedLines.length - 1];
    if (lastLine[lastLine.length - 1] === ';') lastLine = lastLine[lastLine.length - 1].slice(0, -1);
    trimmedLines[trimmedLines.length - 1] = lastLine;
    return trimmedLines.join('');
}

function functionAlreadyCaptured(triggeredFunctionCode, functionsTriggered) {
    const cleanTriggeredFunctionCode = removeIndentation(triggeredFunctionCode);

    return functionsTriggered.some((loggedFunctionCode) => {
        const cleanLoggedFunctionCode = removeIndentation(loggedFunctionCode);
        return cleanLoggedFunctionCode.includes(cleanTriggeredFunctionCode);
    });
}


module.exports = {
    patchModuleLoad,
    functionAlreadyCaptured
};
