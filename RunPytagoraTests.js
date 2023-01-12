const axios = require('axios');
const fs = require('fs');

async function makeRequest(test) {
    try {
        const response = await axios({
            method: test.method,
            url: test.url,
            headers: test.headers,
            data: test.body || {},
            validateStatus: function (status) {
                return status >= 100 && status < 600;
            }
        });

        let testResult = response.status >= 200 && response.status < 300 ? compareResponse(response.data, test.responseData) :
            response.status >= 300 && response.status < 400 ? compareResponse(response.data, test.responseData) : compareResponse(response.data, test.responseData);

        testResult ? console.log(`Test for ${test.url} PASSED!`) : console.error(`Test for ${test.url} FAILED!`);
    } catch (error) {
        console.error(error);
    }
}

function compareResponse(a, b) {
    return typeof a !== typeof b ? false :
        typeof a === 'string' && a.toLowerCase().includes('<!doctype html>') && b.toLowerCase().includes('<!doctype html>') ? true : //todo make appropriate check
            typeof a === 'object' ? compareJson(a,b) : a === b;
}

function compareJson(a, b) {
    let aProps = Object.getOwnPropertyNames(a);
    let bProps = Object.getOwnPropertyNames(b);
    if (aProps.length !== bProps.length) {
        return false;
    }
    for (let i = 0; i < aProps.length; i++) {
        let propName = aProps[i];
        if (a[propName] !== b[propName]) {
            if (typeof a[propName] === 'object') {
                if (!compareJson(a[propName], b[propName]))
                    return false;
            } else
                return false;
        }
    }
    return true;
}

(async () => {
    const directory = './pytagora_data';

    try {
        let files = fs.readdirSync(directory);
        files = files.filter(f => f[0] !== '.' && !(f[0] === '|' && f[1] === '.'));
        console.log(files);
        console.log(`Starting tests on ${files.length} endpoints...`);
        for (let file of files) {
            let tests = JSON.parse(fs.readFileSync(`./pytagora_data/${file}`));
            console.log(`Testing ${tests.length} tests for ${file.replace('|', '/')}...`);
            for (let test of tests) {
                await makeRequest(test);
            }
        }
        console.log('Finished all tests!');
    } catch (err) {
        console.error("Error occured while running Pytagora tests: ", err);
    }
})();
