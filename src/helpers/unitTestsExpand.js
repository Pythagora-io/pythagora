const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const { expandUnitTests, checkForAPIKey } = require("./api");
const {
  PYTHAGORA_UNIT_DIR,
} = require("../const/common");
const { checkDirectoryExists } = require("../utils/common");
const {
  getAstFromFilePath,
  getRelatedTestImports,
  getSourceCodeFromAst,
  getModuleTypeFromFilePath,
  replaceRequirePaths
} = require("../utils/code");
const { getFunctionsForExport, sortFolderTree } = require("./unitTests");
const { checkPathType, getRelativePath, getTestFolderPath } = require("../utils/files");
const { initScreenForUnitTests } = require("./cmdGUI");
const { green, red, blue, bold, reset } = require("../utils/cmdPrint").colors;

let functionList = {},
  screen,
  scrollableContent,
  spinner,
  rootPath = "",
  queriedPath = "",
  folderStructureTree = [],
  testsGenerated = [],
  skippedFiles = [],
  errors = [],
  ignoreFolders = ["node_modules", "pythagora_tests"],
  filesEndingWith = [".js", ".ts", ".tsx"],
  processExtensions = [".js", ".ts"],
  ignoreErrors = ["BABEL_PARSER_SYNTAX_ERROR"],
  force;

async function saveTests(filePath, fileName, newTests) {
  let dir = filePath.substring(0, filePath.lastIndexOf("/"));
  if (!await checkDirectoryExists(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  let testPath = path.join(dir, `/${fileName}`);
  fs.writeFileSync(testPath, newTests);
  return testPath;
}

function reformatDataForPythagoraAPI(filePath, testCode, relatedCode, syntaxType) {
  const importedFiles = [];
  _.forEach(relatedCode, (f) =>  {
      const testPath = path.join(
          path.resolve(PYTHAGORA_UNIT_DIR),
          filePath.replace(rootPath, "")
      );
      const pathRelativeToTest = getRelativePath(f.filePath, testPath.substring(0, testPath.lastIndexOf("/")));
      f.pathRelativeToTest = pathRelativeToTest;
      if (!importedFiles.find(i => i.filePath == f.filePath)) {
          importedFiles.push({
              fileName: f.fileName.substring(f.fileName.lastIndexOf("/") + 1),
              filePath: f.filePath,
              pathRelativeToTest: f.pathRelativeToTest,
              syntaxType: f.syntaxType
          });
      }
      if (f.relatedFunctions.length) {
          f.relatedFunctions = _.map(f.relatedFunctions, (f) => ({...f, fileName: f.fileName.substring(f.fileName.lastIndexOf("/") + 1)}) )
          f.relatedFunctions.forEach((f) => importedFiles.push({
              ...f,
              pathRelativeToTest: getRelativePath(f.filePath, testPath.substring(0, testPath.lastIndexOf("/")))
          }))
      }
  })
  const testFilePath = getTestFolderPath(filePath, rootPath);
  const pathRelativeToTest = getRelativePath(filePath, testFilePath);
  return {
      testFileName: filePath.substring(filePath.lastIndexOf("/") + 1),
      testCode,
      relatedCode,
      importedFiles,
      isES6Syntax: syntaxType === "ES6",
      pathRelativeToTest,
      filePath
  };
}

async function createAdditionalTests(filePath, prefix) {
  try {
    const ast = await getAstFromFilePath(filePath);
    let syntaxType = await getModuleTypeFromFilePath(ast);
    const testPath = path.join(
      path.resolve(PYTHAGORA_UNIT_DIR),
      filePath.replace(rootPath, "")
    );

    let testCode = getSourceCodeFromAst(ast);
    testCode = replaceRequirePaths(
      testCode,
      path.dirname(filePath),
      testPath.substring(0, testPath.lastIndexOf("/"))
    );

    sortFolderTree(folderStructureTree);

    const relatedTestCode = getRelatedTestImports(ast, filePath, functionList);
    const formattedData = reformatDataForPythagoraAPI(
      filePath,
      testCode,
      relatedTestCode,
      syntaxType
    );

    const fileIndex = folderStructureTree.findIndex(
      (item) => item.absolutePath === filePath
    );
    spinner.start(folderStructureTree, fileIndex);

    if (fs.existsSync(testPath) && !force) {
      skippedFiles.push(testPath);
      await spinner.stop();
      folderStructureTree[
        fileIndex
      ].line = `${green}${folderStructureTree[fileIndex].line}${reset}`;
      return;
    }

    let { tests, error } = await expandUnitTests(formattedData, (content) => {
      scrollableContent.setContent(content);
      scrollableContent.setScrollPerc(100);
      screen.render();
    });

    if (tests) {
      await saveTests(testPath, formattedData.testFileName, tests);
      testsGenerated.push(testPath);
      await spinner.stop();
      folderStructureTree[
        fileIndex
      ].line = `${green}${folderStructureTree[fileIndex].line}${reset}`;
    } else if (error) {
      errors.push({
        file: filePath,
        error: { stack: error.stack, message: error.message },
      });
      await spinner.stop();
      folderStructureTree[
        fileIndex
      ].line = `${red}${folderStructureTree[fileIndex].line}${reset}`;
    }
  } catch (e) {
    if (!ignoreErrors.includes(e.code)) errors.push(e.stack);
  }
}

function checkForTestFilePath(filePath) {
  const pattern = /test\.(js|ts|tsx)$/;
  return pattern.test(filePath);
}

async function traverseDirectoryTests(directory, prefix = "") {
  if (
    (await checkPathType(directory)) === "file" &&
    checkForTestFilePath(directory)
  ) {
    const newPrefix = `|   ${prefix}|   `;
    return await createAdditionalTests(directory, newPrefix);
  } else if (
    (await checkPathType(directory)) === "file" &&
    !checkForTestFilePath(directory)
  ) {
    throw new Error("Invalid test file path");
  }

  const files = fs.readdirSync(directory);
  for (const file of files) {
    const absolutePath = path.join(directory, file);
    const stat = fs.statSync(absolutePath);
    if (stat.isDirectory()) {
      if (
        ignoreFolders.includes(path.basename(absolutePath)) ||
        path.basename(absolutePath).charAt(0) === "."
      )
        continue;
      await traverseDirectoryTests(absolutePath, prefix);
    } else {
      if (
        !processExtensions.includes(path.extname(absolutePath)) ||
        !checkForTestFilePath(file)
      )
        continue;
      await createAdditionalTests(absolutePath, prefix);
    }
  }
}

async function expandTestsForDirectory(args) {
  let pathToProcess = args.path;
  force = args.force;

  checkForAPIKey();
  queriedPath = path.resolve(pathToProcess);
  rootPath = args.pythagora_root;
  console.log("Processing folder structure...");

  const exportData = await getFunctionsForExport(
    queriedPath,
    rootPath,
    (fileName) => {
      return !filesEndingWith.some((ending) => fileName.endsWith(ending));
    }
  );
  functionList = exportData.functionList;
  folderStructureTree = exportData.folderStructureTree;
  folderStructureTree = folderStructureTree.filter(
    (i) => checkForTestFilePath(i.absolutePath) || i.isDirectory
  );

  ({ screen, spinner, scrollableContent } = initScreenForUnitTests());

  await traverseDirectoryTests(queriedPath, false);

  screen.destroy();
  process.stdout.write("\x1B[2J\x1B[0f");
  if (errors.length) {
    let errLogPath = `${path.resolve(PYTHAGORA_UNIT_DIR, "errorLogs.log")}`;
    fs.writeFileSync(errLogPath, JSON.stringify(errors, null, 2));
    console.error(
      "There were errors encountered while trying to expand unit tests.\n"
    );
    console.error(`You can find logs here: ${errLogPath}`);
  }
  if (skippedFiles.length)
    console.log(
      `${bold}Generation of ${skippedFiles.length} test suites were skipped because tests already exist. If you want to override them add "--force" flag to command${reset}`
    );
  if (testsGenerated.length === 0) {
    console.log(`${bold + red}No tests generated!${reset}`);
  } else {
    console.log(
      `Tests are saved in the following directories:${testsGenerated.reduce(
        (acc, item) => acc + "\n" + blue + item,
        ""
      )}`
    );
    console.log(
      `${bold + green}${testsGenerated.length} unit tests generated!${reset}`
    );
  }

  process.exit(0);
}

module.exports = {
  expandTestsForDirectory,
};
