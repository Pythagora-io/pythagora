const AVAILABLE_MODES = ['capture', 'test'];
const argsStr = process.env.PYTHAGORA_CONFIG;
const { logAndExit, deleteAllFailedTests, deleteTest } = require('../helpers/starting.js');

const argArray = argsStr.split("--");
const args = {};

for (let i = 0; i < argArray.length; i++) {
    const arg = argArray[i].trim().split(' ');

    if (arg.length < 2) continue;
    args[arg[0]] = arg.length > 2 ? arg.slice(1) : arg[1];
}

if (args.delete_all_failed) deleteAllFailedTests();

if (args.delete) deleteTest(args.delete);

if (!args.mode) {
    if (args.rerun_all_failed || args.test) {
        console.log('Mode not provided. Setting to "test".');
        args.mode = 'test';
    } else {
        console.log('Mode not provided. Defaulting to "capture".');
        args.mode = 'capture';
    }
} else if (!AVAILABLE_MODES.includes(args.mode)) {
    logAndExit(`Mode "${args.mode}" not recognized. Available modes are: ${AVAILABLE_MODES.join(', ')}`);
}

if (args.rerun_all_failed && args.mode !== 'test') logAndExit(`Flag --rerun_all_failed allowed only in "--mode test"`);
if (args.test && args.mode !== 'test') logAndExit(`Flag --test allowed only in "--mode test"`);
if (args.rerun_all_failed && args.test) logAndExit(`Not allowed to set flags --rerun_all_failed and --test at same time.`);

if (args.pick && args.mode !== 'capture') logAndExit(`Flag --pick allowed only in "--mode capture"`);
if (args.ignore && args.mode !== 'capture') logAndExit(`Flag --ignore allowed only in "--mode capture"`);

console.log(`Running "${process.env.PYTHAGORA_CONFIG}" using Pythagora in "${args.mode.toUpperCase()}" mode.`);

module.exports = args
