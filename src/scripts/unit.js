const {generateTestsForDirectory} = require("../helpers/unitTests");
let args = require('../utils/argumentsCheck.js');

generateTestsForDirectory(args.dir, args.test_id);
