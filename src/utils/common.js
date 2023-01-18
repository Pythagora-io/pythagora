const cutWithDots = (string, cutAtChar = 100) => {
    return (string && string.length > cutAtChar) ? string.slice(0, cutAtChar) + '...' : string;
}
module.exports = {
    cutWithDots
}
