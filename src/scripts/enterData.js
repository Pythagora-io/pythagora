const {loginRouteEnteredLog} = require("../utils/cmdPrint");
const {updateMetadata} = require("../utils/common");
const {METADATA_FILENAME, SRC_TO_ROOT} = require("../const/common");
// TODO make require path better!!
let pythagoraMetadata = require(`../${SRC_TO_ROOT}.pythagora/${METADATA_FILENAME}`);
const readline = require("readline");
const _ = require("lodash");


function askForLoginRoute(rl) {
    rl.question('Please enter the endpoint path of the login route (eg. /api/auth/login): ', loginPath => {
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

addExportData();
