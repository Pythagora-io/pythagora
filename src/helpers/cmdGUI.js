const blessed = require("blessed");
const Spinner = require("../utils/Spinner");


function initScreenForUnitTests() {
    let screen = blessed.screen({
        smartCSR: true,
        fullUnicode: true,
    });

    let leftPanel = blessed.box({
        width: '50%',
        height: '100%',
        border: { type: 'line' },
        scrollable: true,
        alwaysScroll: true,
        scrollbar: {
            ch: ' '
        },
        keys: true,
        vi: true
    });

    let rightPanel = blessed.box({
        width: '50%',
        height: '100%',
        left: '50%',
        border: { type: 'line' }
    });

    let scrollableContent = blessed.box({
        parent: rightPanel,
        scrollable: true,
        alwaysScroll: true,
        scrollbar: {
            ch: ' '
        },
        keys: true,
        vi: true
    });

    screen.append(leftPanel);
    screen.append(rightPanel);
    screen.render();
    screen.key(['C-c'], function () {
        return process.exit(0);
    });

    let spinner = new Spinner(leftPanel, screen);

    return {screen, leftPanel, rightPanel, scrollableContent, spinner};
}

module.exports = {
    initScreenForUnitTests
}
