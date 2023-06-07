const path = require("path");
const {PYTHAGORA_UNIT_DIR} = require("../const/common");
const fs = require("fs").promises;


async function checkPathType(path) {
    let stats = await fs.stat(path);
    return stats.isFile() ? 'file' : 'directory';
}

function getRelativePath(filePath, referenceFilePath) {
    let relativePath = path.relative(path.dirname(referenceFilePath), filePath);
    if (!relativePath.startsWith('../') && !relativePath.startsWith('./')) {
        relativePath = './' + relativePath;
    }
    return relativePath;
}


function getFolderTreeItem(prefix, isLast, name, absolutePath) {
    return {
        line: `${prefix}${isLast ? '└───' : '├───'}${name}`,
        absolutePath
    };
}

function isPathInside(basePath, targetPath) {
    const relativePath = path.relative(basePath, targetPath);
    return !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
}

function getTestFilePath(filePath, rootPath) {
    return path.join(
        path.resolve(PYTHAGORA_UNIT_DIR),
        path.dirname(filePath).replace(rootPath, ''),
        path.basename(filePath, path.extname(filePath))
    );
}

module.exports = {
    checkPathType,
    getRelativePath,
    getFolderTreeItem,
    isPathInside,
    getTestFilePath
}
