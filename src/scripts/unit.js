const {generateTestsForDirectory} = require("../helpers/unitTests");
let args = require('../utils/argumentsCheck.js');

if (!args.path && !args.func) {
    console.log("Please provide a path or a function name to test");
    process.exit(1);
}
if (!args.path) args.path = process.cwd();
generateTestsForDirectory(args.path, args.func);
