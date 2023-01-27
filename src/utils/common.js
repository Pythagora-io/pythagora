const objectIdAsStringRegex = /ObjectId\("([0-9a-fA-F]{24})"\)/;
const mongoIdRegex = /^[0-9a-fA-F]{24}$/;

const isObjectId = (value) => {
    try {
        return (!value || !value.toString) ? false :
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
    return !value ? false : value.constructor.name === 'ObjectID' && isJSONObject(value.id);
}

const cutWithDots = (string, cutAtChar = 100) => {
    return (string && string.length > cutAtChar) ? string.slice(0, cutAtChar) + '...' : string;
}

function addIdToUrl(url, id) {
    return `${url}${url.includes('?') ? '&' : '?'}reqId=${id}`;
}

function compareResponse(a, b) {
    if (typeof a === 'string' && typeof b === 'string') {
        try {
            let tempA = JSON.parse(a);
            let tempB = JSON.parse(b);
            if (typeof tempA === 'object' && typeof tempB === 'object') {
                a = tempA;
                b = tempB;
            }
        } catch (e) {
            //dummy catch
        }
    }
    return typeof a !== typeof b ? false :
        typeof a === 'string' && a.toLowerCase().includes('<!doctype html>') && b.toLowerCase().includes('<!doctype html>') ? true : //todo make appropriate check
            typeof a === 'object' && typeof b === 'object' ? compareJson(a,b) : a === b;
}

function isDate(date) {
    return (new Date(date) !== "Invalid Date") && !isNaN(new Date(date));
}

function isJSONObject(value) {
    return Object.prototype.toString.call(value) === "[object Object]";
}

function compareJson(a, b) {
    // TODO make more complex by running tests right after capture
    if (a === b) return true;
    else if (typeof a !== typeof b) return false;
    else if (!a || !b) return false;
    else if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        return a.reduce((acc, item, index) => acc && compareJson(item, b[index]), true);
    }
    let ignoreKeys = ['_id'];
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
                if (!compareJson(a[propName], b[propName]))
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

module.exports = {
    cutWithDots,
    addIdToUrl,
    compareResponse,
    isDate,
    compareJson,
    isObjectId,
    isLegacyObjectId,
    isJSONObject,
    objectIdAsStringRegex,
    mongoIdRegex,
    noUndefined
}
