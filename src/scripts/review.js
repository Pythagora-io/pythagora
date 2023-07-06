const fs = require('fs');
const path = require('path');
const readline = require('readline');
const _ = require('lodash');
let args = require('../utils/getArgs.js');

const { PYTHAGORA_TESTS_DIR, PYTHAGORA_METADATA_DIR, REVIEW_DATA_FILENAME } = require('../const/common.js');
const { logChange } = require('../utils/cmdPrint.js');
const { compareJson, getMetadata } = require('../utils/common.js');

const reviewFilePath = path.resolve(args.pythagora_root, PYTHAGORA_METADATA_DIR, REVIEW_DATA_FILENAME);
const metadata = getMetadata();

if (!fs.existsSync(reviewFilePath)) return console.log('There is no changes stored for review. Please run tests first.');

const data = fs.readFileSync(reviewFilePath);
const changes = JSON.parse(data);
let processedIndexes = [];

const changesActions = {
    A: {
        fn: 'acceptChange',
        msg: 'accept changes'
    },
    D: {
        fn: 'deleteChange',
        msg: 'delete test'
    },
    S: {
        fn: 'skipChange',
        msg: 'skip test'
    },
    R: {
        fn: 'getRunCmd',
        msg: 'get command to run this test'
    },
    Q: {
        fn: 'quitReview',
        msg: 'quit review'
    }
};
const ignoreKeys = ['id', 'filename', 'errors'];

function saveReviewJson(i, oldJson) {
    processedIndexes.push(i);
    let reviewJson = oldJson.filter((el, i) => !processedIndexes.includes(i))
    fs.writeFileSync(reviewFilePath, JSON.stringify(reviewJson, null, 2));
}

function acceptChange(change, index, reviewJson) {
    let filePath = path.resolve(args.pythagora_root, PYTHAGORA_TESTS_DIR, change.filename);
    let file = fs.readFileSync(filePath);
    let json = JSON.parse(file);

    json = json.map((test) => {
        if (test.id === change.id) {
            let keysToUpdate = Object.keys(change).filter((key) => !ignoreKeys.includes(key));
            for (let key of keysToUpdate) {
                test[key] = change[key].test;
            }
        }
        return test;
    });

    fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
    saveReviewJson(index, reviewJson);
    console.log('Test updated successfully!');
}

function deleteChange(change, index, reviewJson) {
    let filePath = path.resolve(args.pythagora_root, PYTHAGORA_TESTS_DIR, change.filename);
    let file = fs.readFileSync(filePath);
    let json = JSON.parse(file);

    let newJson = json.filter((test) => test.id !== change.id);

    fs.writeFileSync(filePath, JSON.stringify(newJson, null, 2));
    saveReviewJson(index, reviewJson);
    console.log('Test deleted successfully!');
}

function skipChange(change) {
    console.log(`Skipped reviewing change for test with id: ${change.id}`);
}

function getRunCmd(change) {
    console.log(`You can run this test with command:`);
    console.log(`\x1b[34m\x1b[1mnpx pythagora --init-command "${metadata.initCommand}" --mode test --test-id ${change.id}\x1b[0m`);
    process.exit(0);
}

function quitReview(change) {
    console.log(`Exiting review...`);
    process.exit(0);
}

function findDiffQueries(intermediateData1, intermediateData2) {
    let mongoDiff = [];

    intermediateData1.forEach((data) => {
        let data2 = intermediateData2.find((d) =>
            d.type === 'mongodb' &&
            d.collection === data.collection &&
            d.op === data.op &&
            !d.processed
        );

        if (data2) {
            mongoDiff.push({
                capture: data,
                test: data2
            });
            data2.processed = true;
        }
    });

    intermediateData2.forEach((data) => { if (data.processed) delete data.processed; });

    return mongoDiff;
}

function findNonMatchingQueries(intermediateData1, intermediateData2) {
    let nonMatchingQueries = intermediateData1.filter((i) => {
        let intData = intermediateData2.find((d) =>
            d.type === 'mongodb' &&
            d.collection === i.collection &&
            d.op === i.op &&
            compareJson(d.query, i.query, true) &&
            compareJson(d.options, i.options, true) &&
            compareJson(d.otherArgs, i.otherArgs, true) &&
            !d.processed
        );

        if (intData) intData.processed = true;

        return !intData;
    });

    intermediateData2.forEach((data) => { if (data.processed) delete data.processed; });

    return nonMatchingQueries;
}

function processIntermediateData(captureIntermediateData, testIntermediateData) {
    let mongoNotExecuted = findNonMatchingQueries(captureIntermediateData, testIntermediateData);
    let mongoQueryNotFound = findNonMatchingQueries(testIntermediateData, captureIntermediateData);
    let mongoDiff = findDiffQueries(mongoQueryNotFound, mongoNotExecuted);
    let idMap = _.flatten(mongoDiff.map((m) => [m.capture.id, m.test.id]));

    mongoQueryNotFound = mongoQueryNotFound.filter((q) => !idMap.includes(q.id));
    mongoNotExecuted = mongoNotExecuted.filter((q) => !idMap.includes(q.id));

    return { mongoDiff, mongoQueryNotFound, mongoNotExecuted }
}

function generatePrompt() {
    let prompt = '';

    Object.keys(changesActions).forEach(function(key, index) {
        let len = Object.keys(changesActions).length;
        prompt += index + 2 === len ? `${changesActions[key].msg}(${key}) ` :
            index + 1 === len ? `or ${changesActions[key].msg}(${key}) ` :
                `${changesActions[key].msg}(${key}), ` ;
    });

    prompt += ': ';

    return prompt;
}

const displayChangesAndPrompt = (index, arr, displayChange = true) => {
    // Check if we have reached the end of the array
    if (index >= arr.length) {
        console.log('All changes processed.');
        return;
    }

    let change = arr[index];

    // Display the JSON data to the user
    if (displayChange) {
        let filePath = path.resolve(args.pythagora_root, PYTHAGORA_TESTS_DIR, change.filename);
        let capturedRequests = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        let req = capturedRequests.find(request => request.id === change.id);
        if (!req) {
            setTimeout(() => {
                displayChangesAndPrompt(index + 1, arr);
            }, 0);
        }

        let { mongoNotExecuted, mongoQueryNotFound, mongoDiff } = processIntermediateData(req.intermediateData, change.intermediateData.test);
        let mongoResDiff = change.errors ? change.errors.filter((e) => e.type === 'mongoResultDifferent') : [];

        logChange(change, ignoreKeys.concat(['intermediateData']), mongoNotExecuted, mongoQueryNotFound, mongoDiff, mongoResDiff);
    }

    // Create a readline interface to prompt the user for input
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    // Prompt the user to input a character
    rl.question(generatePrompt(), (answer) => {
        answer = answer.toUpperCase();
        // Close the readline interface
        rl.close();

        // Call the appropriate function based on the user's input: acceptChange(), deleteChange(), skipChange(),...
        if (changesActions[answer]) {
            let functionName = `${changesActions[answer].fn}`;
            eval(functionName)(change, index, arr);
            // Call the function again for the next element after waiting for user input
            setTimeout(() => {
                displayChangesAndPrompt(index + 1, arr);
            }, 0);
        } else {
            console.error(`Invalid input. Please enter ${Object.keys(changesActions).join('/')}.`);
            // Call the function again for the same element after waiting for user input
            setTimeout(() => {
                displayChangesAndPrompt(index, arr, false);
            }, 0);
        }
    });
}

displayChangesAndPrompt(0, changes);
