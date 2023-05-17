const _ = require("lodash");
const path = require("path");
const fs = require("fs");
const GPT3Tokenizer = require("gpt3-tokenizer");
const { Configuration, OpenAIApi } = require("openai");
const {insertVariablesInText} = require("../utils/common");
const {testExportStartedLog, jestAuthFileGenerationLog} = require("../utils/cmdPrint");
const https = require("https");
const args = require("../utils/argumentsCheck");
const {MIN_TOKENS_FOR_GPT_RESPONSE, MAX_GPT_MODEL_TOKENS} = require("../const/common");
let configuration, openai;

async function getOpenAIClient() {
    configuration = await new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
    });
    openai = await new OpenAIApi(configuration);
}

function getPromptFromFile(fileName, variables) {
    const fileContent = fs.readFileSync(path.join(__dirname, `../prompts/${fileName}`), 'utf8');
    return insertVariablesInText(fileContent, variables);
}

function getTokensInMessages(messages) {
    let rawMessages = messages.map(message => message.content).join('\n');
    const tokenizer = new GPT3Tokenizer.default({ type: 'gpt3' }); // or 'codex'
    const encodedPrompt = tokenizer.encode(rawMessages);
    return encodedPrompt.text.length;
}

async function createGPTChatCompletion(messages, minTokens = MIN_TOKENS_FOR_GPT_RESPONSE, noStream = args.no_stream) {
    let tokensInMessages = getTokensInMessages(messages);
    if (tokensInMessages + minTokens > MAX_GPT_MODEL_TOKENS) {
        console.error(`Too many tokens in messages: ${tokensInMessages}. Please try a different test.`);
        process.exit(1);
    }

    let gptData = {
        model: "gpt-4",
        n: 1,
        max_tokens: Math.min(4096, MAX_GPT_MODEL_TOKENS - tokensInMessages),
        messages
    };

    try {
        if (noStream) {
            let result = await openai.createChatCompletion(gptData);
            return result.data.choices[0].message.content;
        } else {
            return await streamGPTCompletion(gptData);
        }
    } catch (e) {
        console.error('The request to OpenAI API failed. Might be due to GPT being down or due to the too large message. It\'s best if you try another export.')
        process.exit(1);
    }
}

async function getJestTestFromPythagoraData(reqData) {
    testExportStartedLog();
    await getOpenAIClient();
    return await createGPTChatCompletion([
        {"role": "system", "content": "You are a QA engineer and your main goal is to find ways to break the application you're testing. You are proficient in writing automated integration tests for Node.js API servers.\n" +
                "When you respond, you don't say anything except the code - no formatting, no explanation - only code.\n" },
        {
            "role": "user",
            "content": getPromptFromFile('generateJestTest.txt', { testData: reqData }),
        },
    ]);
}

async function getJestTestName(test, usedNames) {
    await getOpenAIClient();
    return await createGPTChatCompletion([
        {"role": "system", "content": "You are a QA engineer and your main goal is to think of good, human readable jest tests file names. You are proficient in writing automated integration tests for Node.js API servers.\n" +
                "When you respond, you don't say anything except the filename - no formatting, no explanation, no code - only filename.\n" },
        {
            "role": "user",
            "content": getPromptFromFile('generateJestTestName.txt', { test, usedNames }),
        },
    ], 200, true);
}

async function getJestAuthFunction(loginMongoQueriesArray, loginRequestBody, loginEndpointPath) {
    jestAuthFileGenerationLog();
    await getOpenAIClient();

    let prompt = getPromptFromFile('generateJestAuth.txt', {
        loginRequestBody,
        loginMongoQueriesArray,
        loginEndpointPath
    });

    return await createGPTChatCompletion([
        {"role": "system", "content": "You are a QA engineer and your main goal is to find ways to break the application you're testing. You are proficient in writing automated integration tests for Node.js API servers.\n" +
                "When you respond, you don't say anything except the code - no formatting, no explanation - only code.\n" +
                "\n" +
                "You are very careful when asserting IDs because you have experienced that IDs can be different in the database from the IDs that are captured in the API request data from which you're creating tests.\n" +
                "\n" +
                "When you create names for your tests you make sure that they are very intuitive and in a human-readable form."},
        {
            "role": "user",
            "content": prompt,
        },
    ]);
}

async function streamGPTCompletion(data) {
    let gptResponse = '';

    data.stream = true;

    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'api.openai.com',
            port: 443,
            path: '/v1/chat/completions',
            method: 'POST',
            headers:{
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY
            }
        }, function(res){
            res.on('data', (chunk) => {
                try {
                    let receivedMessages = extractGPTMessageFromStreamData(chunk.toString());
                    receivedMessages.forEach(rm => {
                        let content = _.get(rm, 'choices.0.delta.content');
                        if (content) {
                            gptResponse += content;
                            process.stdout.write(content);
                        }
                    });

                } catch (e) {}
            });
            res.on('end', () => {
                resolve(gptResponse);
            });
        });

        req.on('error', (e) => {
            console.error("problem with request:"+e.message);
            reject(e);
        });

        req.write(JSON.stringify(data));

        req.end();
    });
}

function extractGPTMessageFromStreamData(input) {
    const regex = /data: (.*?)\n/g;
    const substrings = [];
    let match;

    while ((match = regex.exec(input)) !== null) {
        substrings.push(match[1]);
    }

    return substrings.map(s => JSON.parse(s));
}

module.exports = {
    getJestTestFromPythagoraData,
    getJestTestName,
    getJestAuthFunction,
    getTokensInMessages,
    getPromptFromFile
}
