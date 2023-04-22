const _ = require("lodash");
const path = require("path");
const fs = require("fs");
const { Configuration, OpenAIApi } = require("openai");
const {insertVariablesInText} = require("../utils/common");
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

async function getJestTestFromPythagoraData(reqData) {
    await getOpenAIClient();
    const completion = await openai.createChatCompletion({
        model: "gpt-4",
        n: 1,
        max_tokens: 4096,
        messages: [
            {"role": "system", "content": "You are a QA engineer and your main goal is to find ways to break the application you're testing. You are proficient in writing automated integration tests for Node.js API servers.\n" +
                    "When you respond, you don't say anything except the code - no formatting, no explanation - only code.\n" +
                    "\n" +
                    "You are very careful when asserting IDs because you have experienced that IDs can be different in the database from the IDs that are captured in the API request data from which you're creating tests.\n" +
                    "\n" +
                    "When you create names for your tests you make sure that they are very intuitive and in a human-readable form."},
            {
                "role": "user",
                "content": getPromptFromFile('generateJestTest.txt', { testData: reqData }),
            },
        ],
    });

    return completion.data.choices[0].message.content;
}

async function getJestAuthFunction(reqData) {
    await getOpenAIClient();
    const completion = await openai.createChatCompletion({
        model: "gpt-4",
        n: 1,
        max_tokens: 4096,
        messages: [
            {"role": "system", "content": "You are a QA engineer and your main goal is to find ways to break the application you're testing. You are proficient in writing automated integration tests for Node.js API servers.\n" +
                    "When you respond, you don't say anything except the code - no formatting, no explanation - only code.\n" +
                    "\n" +
                    "You are very careful when asserting IDs because you have experienced that IDs can be different in the database from the IDs that are captured in the API request data from which you're creating tests.\n" +
                    "\n" +
                    "When you create names for your tests you make sure that they are very intuitive and in a human-readable form."},
            {
                "role": "user",
                "content": getPromptFromFile('generateJestAuth.txt', { testData: reqData }),
            },
        ],
    });

    return completion.data.choices[0].message.content;
}

module.exports = {
    getJestTestFromPythagoraData
}
