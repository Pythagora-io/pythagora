const {expandTestsForDirectory} = require("../helpers/unitTestsExpand.js");
let args = require('../utils/getArgs.js');
const {setUpPythagoraDirs} = require("../helpers/starting.js");

if (!args.expand_path) args.expand_path = process.cwd();
setUpPythagoraDirs();
expandTestsForDirectory(args);
