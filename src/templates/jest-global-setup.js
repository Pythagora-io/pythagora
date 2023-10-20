module.exports = async () => {
    // Check if the developer has opted out of telemetry and set the environment variable accordingly
    const optOutTelemetry = process.env.PYTHAGORA_TELEMETRY_ENABLED === 'false';

    if (optOutTelemetry) {
        process.env.PYTHAGORA_TELEMETRY_ENABLED = 'false';
    }

    console.log(`Telemetry is ${optOutTelemetry ? 'disabled' : 'enabled'}`);
};
