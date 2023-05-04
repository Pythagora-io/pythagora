const AVAILABLE_MODES = ['capture', 'test'];
const args = require('./getArgs.js');
const { logAndExit } = require('./cmdPrint.js');

if (!args.mode) {
    if (args.rerun_all_failed || args.test_id) {
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
if (args.test_id && args.mode !== 'test') logAndExit(`Flag --test-id allowed only in "--mode test"`);
if (args.rerun_all_failed && args.test_id) logAndExit(`Not allowed to set flags --rerun_all_failed and --test-id at same time.`);

if (args.pick && args.mode !== 'capture') logAndExit(`Flag --pick allowed only in "--mode capture"`);
if (args.ignore && args.mode !== 'capture') logAndExit(`Flag --ignore allowed only in "--mode capture"`);

console.log(`Running "${process.env.PYTHAGORA_CONFIG}" using Pythagora in "${args.mode.toUpperCase()}" mode.`);

module.exports = args
