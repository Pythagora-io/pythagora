const _ = require("lodash");
const { Configuration, OpenAIApi } = require("openai");

function trimTestData(testData) {
    let trimmedData = _.pick(testData, ['endpoint', 'method', 'body', 'query', 'params']);
    trimmedData.headers = _.pick(testData.headers, ['content-length', 'authorization', 'content-type', 'accept', 'accept-encoding', 'cookie']);
    return trimmedData;
}

async function getNegativeTestsFromGPT(reqData) {
    const configuration = await new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
    });
    const openai = await new OpenAIApi(configuration);
    let trimmedTestData = trimTestData(reqData);
    const completion = await openai.createChatCompletion({
        model: "gpt-4",
        n: 1,
        max_tokens: 4096,
        messages: [
            {"role": "system", "content": "You are a QA engineer and your main goal is to find ways to break the application you're testing."},
            {"role": "user", "content": "I will give you an API request data and I want you to give me the negative test data. Negative test data is a JSON object with an array of possible values for parameters in the API request data that might break the server - they will be used to create negative tests. \n" +
                    "For example, if an API request data looks like this:\n" +
                    "```\n" +
                    "{\n" +
                    "    \"endpoint\": \"/api/category/add\",\n" +
                    "    \"httpMethod\": \"POST\",\n" +
                    "    \"body\": {\n" +
                    "      \"name\": \"sdcvdvc\",\n" +
                    "      \"description\": \"ccbvc\",\n" +
                    "      \"products\": [\n" +
                    "        \"63ed3108b81ccc28a4d9eaf2\"\n" +
                    "      ],\n" +
                    "      \"headers\": {\n" +
                    "            \"authorization\": \"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY0MjU2ZDljNDA4NzgzMzE0NGQ3MWMxNiIsImlhdCI6MTY4MDE3NDU0MiwiZXhwIjoxNjgwNzc5MzQyfQ.hy-D-AdsWSuUg3f1CH03FBHQFMFtwmklRwDCckvbzHk\",\n" +
                    "        \"accept\": \"application/json, text/plain, */*\"\n" +
                    "    }\n" +
                    "```\n" +
                    "\n" +
                    "You would return something like this:\n" +
                    "```\n" +
                    "{\n" +
                    "  \"body.name\": [...],\n" +
                    "  \"body.description\": [...],\n" +
                    "  \"body.products\": [...],\n" +
                    "  \"headers.authorization\": [...],\n" +
                    "  \"headers.accept\": [...],\n" +
                    "  \"endpoint\": [...],\n" +
                    "  \"httpMethod\": [...]\n" +
                    "}\n" +
                    "```\n" +
                    "Make sure that each array consists only of values that could break the server and, when you answer, that you don't say anything else except the JSON object.\n" +
                    "\n" +
                    "Also, here are types of negative tests to help you think: \n" +
                    "1. Empty or missing required fields\n" +
                    "2. Invalid field values - exceeding character limits\n" +
                    "3. Invalid field values - malformed data\n" +
                    "4. Extra or irrelevant keys in the payload\n" +
                    "5. Incorrect or invalid HTTP methods\n" +
                    "6. Invalid endpoint paths\n" +
                    "7. Query parameters instead of using the request body in POST requests\n" +
                    "8. Missing or invalid authentication headers (e.g., API keys)\n" +
                    "9. Incorrect data structure - array instead of an object\n" +
                    "10. Incorrect data structure - object instead of an array\n" +
                    "11. JSON formatting issues - invalid Unicode characters\n" +
                    "12. Duplicate keys in the payload\n" +
                    "13. Invalid or unsupported content types (e.g., sending XML instead of JSON)\n" +
                    "14. Exceeding payload size limits\n" +
                    "15. Invalid or expired authentication tokens\n" +
                    "16. Using special characters in field values\n" +
                    "17. Sending nested objects instead of simple key-value pairs\n" +
                    "18. Sending data in the wrong data type (e.g., string instead of integer)\n" +
                    "19. Sending null values for required fields\n" +
                    "20. Using reserved keywords in field names\n" +
                    "21. Sending incomplete or malformed multipart file uploads\n" +
                    "22. Incorrect or missing URL encoding for special characters\n" +
                    "23. Sending the request body in GET requests\n" +
                    "24. Invalid date or time formats\n" +
                    "25. Using non-ASCII characters in field names\n" +
                    "26. Sending deeply nested objects\n" +
                    "27. Using non-printable or control characters in field values\n" +
                    "28. Sending the same field multiple times with different values\n" +
                    "29. Missing or invalid content-length headers for request bodies\n" +
                    "30. Using spaces or special characters in field names\n" +
                    "31. Sending invalid or malformed JSONP callbacks\n" +
                    "32. Sending the payload as a single string instead of key-value pairs\n" +
                    "33. Sending boolean values as strings (e.g., \"true\" instead of true)\n" +
                    "34. Using non-standard HTTP methods (e.g., PATCH, CONNECT)\n" +
                    "35. Sending unsupported HTTP version numbers\n" +
                    "36. Sending multiple authentication headers (e.g., both API key and token)\n" +
                    "37. Sending unnecessary or invalid CORS headers\n" +
                    "38. Sending conflicting query parameters and request body data\n" +
                    "39. Using non-standard characters in authentication header values\n" +
                    "40. Sending negative numbers for fields that should only accept positive values\n" +
                    "41. Sending timestamps in the future or past beyond expected range\n" +
                    "42. Using HTML, JavaScript, or SQL code in field values to attempt code injection\n" +
                    "43. Using different character encodings in the payload (e.g., UTF-8, UTF-16)\n" +
                    "44. Sending arrays with mixed data types\n" +
                    "45. Sending field values as arrays or objects instead of simple data types (e.g., string, number)\n" +
                    "\n" +
                    "First, respond only with \"Got it\" to process this message.\n"},
            {"role": "assistant", "content": "Got it"},
            {"role": "user", "content": "Here is API request data:\n" +
                    "```json\n" +
                    JSON.stringify(trimmedTestData, null, 2) +
                    "```\n" +
                    "Give the values for negative tests but make sure that you don't give values that might NOT break the server but only something that might trigger an error. " +
                    "Don't start the response with \"```json\" and don't end it with \"```\" but return ONLY the valid JSON. " +
                    "Focus on adding proper brackers and quotes so that the response is a valid JSON. " +
                    "Make sure that you respond with only a valid, executeable JSON object and nothin else (eg. you can't write \`[...]\` because that cannot be executed). " +
                    "Also, try to give, at least, 10 values for each parameter."},
        ],
    });

    let gptResponse = completion.data.choices[0].message.content;
    let negativeTests = [];
    try {
        negativeTests = eval(`let temp = ${gptResponse}; temp;`);
    } catch (e) {
        console.error('Error parsing negative tests from GPT');
        console.error(e);
    }
    return negativeTests;
}

module.exports = {
    getNegativeTestsFromGPT,
}
