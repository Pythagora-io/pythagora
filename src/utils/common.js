const _ = require("lodash");
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
    return typeof date === 'string' && (new Date(date) !== "Invalid Date") && !isNaN(new Date(date));
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
            else if (regExpRegex.test(value)) return stringToRegExp(value);
        }
        return value;
    }

    let noUndObj = noUndefined(obj);
    let stringified = JSON.stringify(noUndObj.toObject ? noUndObj.toObject() : noUndObj, getCircularReplacer());
    return JSON.parse(stringified, reviver);
}

module.exports = {
    cutWithDots,
    compareResponse,
    compareJson,
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
    stringToRegExp,
    isJSONObject
}
