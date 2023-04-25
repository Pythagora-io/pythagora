const _ = require("lodash");
const fs = require("fs");
const net = require('net');
const {PYTHAGORA_METADATA_DIR, METADATA_FILENAME} = require("../const/common");
let mongodb;
// this is needed so that "mongodb" is not required before mongo patches are applied
const ObjectId = class {
    constructor(id) {
        if (!mongodb) mongodb = require("mongodb");
        return new mongodb.ObjectId(id);
    }

    static isValid(value) {
        if (!mongodb) mongodb = require("mongodb");
        return mongodb.ObjectId.isValid(value);
    }
};
const objectIdAsStringRegex = /^ObjectId\("([0-9a-fA-F]{24})"\)$/;
const dateAsStringRegex = /^Date\("(.+)"\)$/;
const iso8601DateRegex = /^(\d{4})-(\d{2})-(\d{2})(T(\d{2}):(\d{2}):(\d{2})(\.(\d{1,3}))?(Z|([+\-])(\d{2}):(\d{2})))?$/;
const regExpRegex = /^RegExp\("(.*)"\)$/;
const mongoIdRegex = /^[0-9a-fA-F]{24}$/;

const isObjectId = (value) => {
    try {
        return (!value || !value.toString || Array.isArray(value)) ? false :
            (
                value.constructor.name === 'ObjectId' ||
                value.constructor.name === 'ObjectID' ||
                mongoIdRegex.test(value.toString()) ||
                objectIdAsStringRegex.test(value.toString())
            );
    } catch (e) {
        return false;
    }
}

const isLegacyObjectId = (value) => {
    return !value || !value.constructor ? false : value.constructor.name === 'ObjectID' && isJSONObject(value.id);
}

const cutWithDots = (string, cutAtChar = 100) => {
    return (string && string.length > cutAtChar) ? string.slice(0, cutAtChar) + '...' : string;
}

function parseString(s) {
    if (typeof s === 'string') {
        try {
            let tempS = JSON.parse(s);
            if (typeof tempS === 'object' || typeof tempS === 'boolean') {
                s = tempS;
            }
        } catch (e) {
            //dummy catch
        }
    }
    return s
}

function compareResponse(a, b) {
    a = parseString(a);
    b = parseString(b);

    return typeof a !== typeof b ? false :
        typeof a === 'string' && a.toLowerCase().includes('<!doctype html>') && b.toLowerCase().includes('<!doctype html>') ? true : //todo make appropriate check
            typeof a === 'object' && typeof b === 'object' ? compareJson(a,b) : a === b;
}

function isDate(date) {
    return (typeof date === 'string' && iso8601DateRegex.exec(date) && (new Date(date) !== "Invalid Date") && !isNaN(new Date(date))) ||
        (typeof date === 'string' && dateAsStringRegex.exec(date)) ||
        (typeof date === 'object' && date instanceof Date);
}

function stringToDate(str) {
    const match = dateAsStringRegex.exec(str);
    if (match) {
        const dateString = match[1];
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            return date;
        }
    }
    return str;
}

function isJSONObject(value) {
    return Object.prototype.toString.call(value) === "[object Object]";
}

function compareJson(a, b, strict) {
    // TODO make more complex by running tests right after capture
    if (a === b) return true;
    else if (typeof a !== typeof b) return false;
    else if (!a || !b) return false;
    else if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        // TODO optimize because this is O(n^2)
        return a.reduce((acc, item, index) => acc && !!b.find(b2 => compareJson(item, b2, strict)), true);
    } else if (typeof a === 'string' && typeof b === 'string') {
        return objectIdAsStringRegex.test(a) && objectIdAsStringRegex.test(b) && !strict ? true : a === b;
    }
    let ignoreKeys = ['stacktrace'];
    // let ignoreIfKeyContains = ['token'];
    let aProps = Object.getOwnPropertyNames(a);
    let bProps = Object.getOwnPropertyNames(b);
    if (aProps.length !== bProps.length) {
        return false;
    }
    for (let i = 0; i < aProps.length; i++) {
        let propName = aProps[i];
        if (
            a[propName] !== b[propName] &&
            (!isDate(a[propName]) && !isDate(a[propName])) &&
            !ignoreKeys.includes(propName) &&
            !(isObjectId(a[propName]) && isObjectId(b[propName]))// &&
            // !ignoreIfKeyContains.some(function(v) { return propName.indexOf(v) >= 0; })
        ) {
            if (typeof a[propName] === 'object') {
                if (!compareJson(a[propName], b[propName], strict))
                    return false;
            } else
                return false;
        }
    }
    return true;
}

function compareJsonDetailed(a, b, strict) {
    let differencesCapture = {};
    let differencesTest = {};

    if (a === b) {
        return { capture: differencesCapture, test: differencesTest };
    } else if (typeof a !== typeof b) {
        differencesCapture.type = { a: typeof a, b: typeof b };
        differencesTest.type = { a: typeof a, b: typeof b };
    } else if (!a || !b) {
        differencesCapture.missing = !!a;
        differencesTest.missing = !!b;
    } else if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) {
            differencesCapture.length = a.length;
            differencesTest.length = b.length;
        }
        // TODO optimize because this is O(n^2)
        for (let i = 0; i < a.length; i++) {
            const itemDifferences = compareJsonDetailed(a[i], b[i], strict);
            if (Object.keys(itemDifferences.capture).length > 0) {
                differencesCapture[`[${i}]`] = itemDifferences.capture;
            }
            if (Object.keys(itemDifferences.test).length > 0) {
                differencesTest[`[${i}]`] = itemDifferences.test;
            }
        }
    } else if (typeof a === 'string' && typeof b === 'string') {
        if (objectIdAsStringRegex.test(a) && objectIdAsStringRegex.test(b) && !strict) {
            return { capture: differencesCapture, test: differencesTest };
        } else if (a !== b) {
            differencesCapture.value = a;
            differencesTest.value = b;
        }
    } else {
        let ignoreKeys = ['stacktrace'];
        let aProps = Object.getOwnPropertyNames(a);
        let bProps = Object.getOwnPropertyNames(b);
        if (aProps.length === 0 && bProps.length === 0 && a !== b) {
            differencesCapture.value = a;
            differencesTest.value = b;
        }
        if (aProps.length !== bProps.length) {
            differencesCapture.propsLength = aProps.length;
            differencesTest.propsLength = bProps.length;
        }
        for (let i = 0; i < aProps.length; i++) {
            let propName = aProps[i];
            if (
                a[propName] !== b[propName] &&
                (!isDate(a[propName]) && !isDate(b[propName])) &&
                !ignoreKeys.includes(propName) &&
                !(isObjectId(a[propName]) && isObjectId(b[propName]))
            ) {
                if (typeof a[propName] === 'object') {
                    const propDifferences = compareJsonDetailed(a[propName], b[propName], strict);
                    if (Object.keys(propDifferences.capture).length > 0) {
                        differencesCapture[propName] = propDifferences.capture;
                    }
                    if (Object.keys(propDifferences.test).length > 0) {
                        differencesTest[propName] = propDifferences.test;
                    }
                } else {
                    differencesCapture[propName] = a[propName];
                    differencesTest[propName] = b[propName];
                }
            }
        }
    }
    return { capture: differencesCapture, test: differencesTest };
}

function noUndefined(value, replaceValue = {}) {
    return value === undefined || value === null ? replaceValue : value;
}

function stringToRegExp(str) {
    let idValue = str.match(regExpRegex);
    if (idValue && idValue[1]) {
        const [, pattern, flags] = idValue[1].match(/^\/(.*)\/([gimuy]+)?$/);
        return new RegExp(pattern, flags);
    }
    return str;
}

const getCircularReplacer = () => {
    const seen = new WeakSet();
    return (key, value) => {
        value = _.clone(value);
        if (isLegacyObjectId(value)) value = (new ObjectId(Buffer.from(value.id.data))).toString();
        else if (value instanceof RegExp) value = `RegExp("${value.toString()}")`;
        else if (Array.isArray(value) && value.find(v => isLegacyObjectId(v))) {
            value = value.map(v => isLegacyObjectId(v) ? (new ObjectId(Buffer.from(v.id.data))).toString() : v);
        } if (typeof value === "object" && value !== null) {
            if (seen.has(value)) {
                return;
            }
            seen.add(value);
        }
        return value;
    };
};

function getOccurrenceInArray(array, value) {
    return array.filter((v) => (v === value)).length;
}

function convertToRegularObject(obj) {
    if (obj === null) return obj;

    const reviver = (key, value) => {
        if (typeof value === 'string') {
            if (value.length === 24 && mongoIdRegex.test(value)) return new ObjectId(value);
            else if (iso8601DateRegex.test(value)) return new Date(value);
            else if (regExpRegex.test(value)) return stringToRegExp(value);
        }
        return value;
    }

    let noUndObj = noUndefined(obj);
    let stringified = JSON.stringify(noUndObj.toObject ? noUndObj.toObject() : noUndObj, getCircularReplacer());
    return JSON.parse(stringified, reviver);
}

function getMetadata() {
    let metadata = fs.readFileSync(`./${PYTHAGORA_METADATA_DIR}/${METADATA_FILENAME}`);
    metadata = JSON.parse(metadata);
    return metadata;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function isPortTaken(port) {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(true);
            } else {
                reject(err);
            }
        });
        server.once('listening', () => {
            server.close();
            resolve(false);
        });
        server.listen(port);
    });
}

async function getFreePortInRange(minPort, maxPort) {
    let listenPort = 0;

    while (!listenPort) {
        listenPort = Math.floor(Math.random() * (maxPort - minPort + 1)) + minPort;
        if (await isPortTaken(listenPort)) {
            console.log(`Port ${listenPort} is already in use`);
            listenPort = 0;
        } else {
            console.log(`Using port ${listenPort}`);
        }
    }

    return listenPort;
}

module.exports = {
    cutWithDots,
    compareResponse,
    compareJson,
    compareJsonDetailed,
    isObjectId,
    isLegacyObjectId,
    noUndefined,
    getCircularReplacer,
    getOccurrenceInArray,
    convertToRegularObject,
    ObjectId,
    objectIdAsStringRegex,
    regExpRegex,
    mongoIdRegex,
    dateAsStringRegex,
    stringToDate,
    stringToRegExp,
    isJSONObject,
    getMetadata,
    delay,
    isPortTaken,
    getFreePortInRange
}
