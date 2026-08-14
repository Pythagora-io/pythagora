const axios = require('axios');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const {PYTHAGORA_METADATA_DIR, CONFIG_FILENAME, PYTHAGORA_API_SERVER} = require("@pythagora.io/js-code-processing").common;
const packageJson = require('../../package.json');

const pythagoraVersion = packageJson.version;
const configPath = path.join(process.cwd(), '../..', PYTHAGORA_METADATA_DIR, CONFIG_FILENAME);

// Calculate the SHA-256 hash of the installation directory
const installationDirectory = path.join(process.cwd(), '../..');
const hash = crypto.createHash('sha256');
hash.update(installationDirectory);
const pathId = hash.digest('hex');

let config;
try {
    config = JSON.parse(fs.readFileSync(configPath));
} catch (err) {
    // Config file doesn't exist or is not valid JSON
}

if (!config) config = {};

// If there's no userId, generate one and save it to the config file
if (!config.userId) {
    config.userId = uuidv4();
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Send the request to the telemetry endpoint
const telemetryData = {
    userId: config.userId,
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
