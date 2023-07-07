const path = require("path");
const {PYTHAGORA_UNIT_DIR} = require("../const/common");
const fs = require("fs").promises;


async function checkPathType(path) {
    let stats = await fs.stat(path);
    return stats.isFile() ? 'file' : 'directory';
}

function getRelativePath(filePath, referenceFolderPath) {
    let relativePath = path.relative(path.resolve(referenceFolderPath), filePath);
    if (!relativePath.startsWith('../') && !relativePath.startsWith('./')) {
        relativePath = './' + relativePath;
    }
    return relativePath;
}


function getFolderTreeItem(prefix, absolutePath) {
    return {
        line: `${prefix}${path.basename(absolutePath)}`,
        absolutePath: absolutePath
    }
}

function isPathInside(basePath, targetPath) {
    const relativePath = path.relative(basePath, targetPath);
    return !relativePath || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

function getTestFolderPath(filePath, rootPath) {
    return path.join(
        path.resolve(PYTHAGORA_UNIT_DIR),
        path.dirname(filePath).replace(rootPath, ''),
        path.basename(filePath, path.extname(filePath))
    );
}

function calculateDepth(basePath, targetPath) {
    const baseComponents = basePath.split(path.sep);
    const targetComponents = targetPath.split(path.sep);

    // The depth is the difference in the number of components
    return targetComponents.length - baseComponents.length + 1;
}

module.exports = {
    checkPathType,
    getRelativePath,
    getFolderTreeItem,
    isPathInside,
    getTestFolderPath,
    calculateDepth
}
