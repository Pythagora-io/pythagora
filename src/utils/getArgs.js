const {PYTHAGORA_METADATA_DIR, CONFIG_FILENAME} = require("../const/common");
const tryrequire = require("tryrequire");
const path = require('path');
const argsStr = process.env.PYTHAGORA_CONFIG || '';

const argArray = argsStr.split("--");
let args = {};

for (let i = 0; i < argArray.length; i++) {
    const arg = argArray[i].trim().split(' ');

    if (!arg[0]) continue;
    args[arg[0].replace(/-/g, '_')] = arg.length > 2 ? arg.slice(1) : (arg[1] || true);
}

const config = tryrequire(path.resolve(args.pythagora_root, PYTHAGORA_METADATA_DIR, CONFIG_FILENAME));

for (let key in config) {
    if (config.hasOwnProperty(key)) {
        args[key] = config[key];
    }
}

module.exports = args
