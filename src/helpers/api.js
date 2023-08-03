const args = require('../utils/getArgs.js');

function getApiConfig() {
    return {
        apiUrl: args.pythagora_api_server || PYTHAGORA_API_SERVER,
        apiKey: args.openai_api_key || args.pythagora_api_key,
        apiKeyType: args.openai_api_key ? 'openai' : 'pythagora'
    }
}

module.exports = {getApiConfig};
