const {loginRouteEnteredLog} = require("../utils/cmdPrint");
const {updateMetadata} = require("../utils/common");
const {setUpPythagoraDirs} = require("../helpers/starting");
const {METADATA_FILENAME, SRC_TO_ROOT} = require("@pythagora.io/js-code-processing").common;
// TODO make require path better!!
const readline = require("readline");
const _ = require("lodash");


function askForLoginRoute(rl) {
    rl.question('\x1b[32m Please enter the endpoint path of the login route (eg. /api/auth/login): \x1b[0m', loginPath => {
        loginRouteEnteredLog(loginPath);

        rl.question('Is this correct login endpoint path (Y/N): ', answer => {
            if (answer.toLowerCase() === 'y') {
                console.log(`Endpoint path saved: ${loginPath}`);
                _.set(pythagoraMetadata, 'exportRequirements.login.endpointPath', loginPath);
                updateMetadata(pythagoraMetadata);
            } else {
                console.log('Endpoint path not confirmed. Please try again.');
            }
            rl.close();
        });
    });
}

function addExportData() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    setTimeout(() => {
        askForLoginRoute(rl);
    }, 500);
}

setUpPythagoraDirs();
let pythagoraMetadata = require(`../${SRC_TO_ROOT}.pythagora/${METADATA_FILENAME}`);
addExportData();
