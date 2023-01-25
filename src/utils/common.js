const mongoObjectIdPattern = /ObjectId\("([0-9a-fA-F]{24})"\)/;
const mongoIdPattern = /^[0-9a-fA-F]{24}$/;

const isObjectId = (value) => {
    return (!value || !value.toString) ? false :
        (
            value.constructor.name === 'ObjectId' ||
            mongoIdPattern.test(value.toString()) ||
            mongoObjectIdPattern.test(value.toString())
        );
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

function compareJson(a, b) {
    // TODO make more complex by running tests right after capture
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

module.exports = {
    cutWithDots,
    addIdToUrl,
    compareResponse,
    isDate,
    compareJson,
    isObjectId
}
