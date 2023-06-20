const axios = require('axios');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const {PYTHAGORA_METADATA_DIR, CONFIG_FILENAME, PYTHAGORA_API_SERVER} = require("../const/common");
const packageJson = require('../../package.json');

const pythagoraVersion = packageJson.version;
const configPath = path.join(process.cwd(), '../..', PYTHAGORA_METADATA_DIR, CONFIG_FILENAME);

// Calculate the SHA-256 hash of the installation directory
const installationDirectory = path.join(process.cwd(), '../..');
const hash = crypto.createHash('sha256');
hash.update(installationDirectory);
const pathId = hash.digest('hex');

// Try to read the config file and get the userId
let userId;
try {
    const config = JSON.parse(fs.readFileSync(configPath));
    userId = config.userId;
} catch (err) {
    // Config file doesn't exist or is not valid JSON
}

// If there's no userId, generate one and save it to the config file
if (!userId) {
    userId = uuidv4();
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify({ userId }, null, 2));
}

// Send the request to the telemetry endpoint
const telemetryData = {
    userId,
    pathId,
    event: 'install',
    pythagoraVersion
};

axios.post(`${PYTHAGORA_API_SERVER}/telemetry`, telemetryData)
    .then((res) => {
        console.log('Telemetry data sent successfully');
    })
    .catch((err) => {
        console.error(`Failed to send telemetry data: ${err.message}`);
    });
