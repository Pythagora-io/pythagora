const AVAILABLE_MODES = ['capture', 'test'];
let { mode, initScript } = require('minimist')(process.argv.slice(2));
if (!initScript) {
    console.error(`
Please provide the script that you use to start your Node.js app by adding --initScript=<relative path to the file you would usually run to start your app>.

Eg. --initScript=./app.js
`);
    process.exit(1);
} else if (!mode) {
    console.log('Mode not provided. Defaulting to "capture".');
    mode = 'capture';
} else if (!AVAILABLE_MODES.includes(mode)) {
    console.error(`Mode "${mode}" not recognized. Available modes are: ${AVAILABLE_MODES.join(', ')}`);
    process.exit(1);
}

console.log(`Running ${initScript} using Pytagora in '${mode.toUpperCase()}' mode.`);

module.exports = {
    mode, initScript
}
