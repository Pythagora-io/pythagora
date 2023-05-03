const _ = require("lodash");
const path = require("path");
const fs = require("fs");
const GPT3Tokenizer = require("gpt3-tokenizer");
const { Configuration, OpenAIApi } = require("openai");
const {insertVariablesInText} = require("../utils/common");
const {testExportStartedLog, jestAuthFileGenerationLog} = require("../utils/cmdPrint");
const MIN_TOKENS_FOR_GPT_RESPONSE = 1640;
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

async function createGPTChatCompletition(messages) {
    let tokensInMessages = getTokensInMessages(messages);
    if (tokensInMessages + MIN_TOKENS_FOR_GPT_RESPONSE > 8192) {
        console.error(`Too many tokens in messages: ${tokensInMessages}. Please try a different test.`);
        process.exit(1);
    }

    let result;

    try {
        result = await openai.createChatCompletion({
            model: "gpt-4",
            n: 1,
            max_tokens: 4096,
            messages
        });
    } catch (e) {
        console.error('The request to OpenAI API failed. Might be due to GPT being down or due to the too large message. It\'s best if you try another export.')
        process.exit(1);
    }

    return result;
}

async function getJestTestFromPythagoraData(reqData) {
    testExportStartedLog();
    await getOpenAIClient();
    const completion = await createGPTChatCompletition([
        {"role": "system", "content": "You are a QA engineer and your main goal is to find ways to break the application you're testing. You are proficient in writing automated integration tests for Node.js API servers.\n" +
                "When you respond, you don't say anything except the code - no formatting, no explanation - only code.\n" },
        {
            "role": "user",
            "content": getPromptFromFile('generateJestTest.txt', { testData: reqData }),
        },
    ]);

    return completion.data.choices[0].message.content;
}

async function getJestAuthFunction(loginMongoQueriesArray, loginRequestBody, loginEndpointPath) {
    jestAuthFileGenerationLog();
    await getOpenAIClient();

    let prompt = getPromptFromFile('generateJestAuth.txt', {
        loginRequestBody,
        loginMongoQueriesArray,
        loginEndpointPath
    });

    const completion = await createGPTChatCompletition([
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

    return completion.data.choices[0].message.content;
}

module.exports = {
    getJestTestFromPythagoraData,
    getJestAuthFunction
}
