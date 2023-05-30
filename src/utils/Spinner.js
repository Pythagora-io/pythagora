const {delay} = require("./common");

class Spinner {
    constructor(panel, screen) {
        this.lineWithoutSpinner = '';
        this.spin = false;
        this.spinnerCharacters = ['-', '\\', '|', '/'];
        this.panel = panel;
        this.screen = screen;
    }

    start(lineWithoutSpinner) {
        this.lineWithoutSpinner = lineWithoutSpinner;
        this.spin = true;
        this.panel.pushLine(this.lineWithoutSpinner);
        let spinnerIndex = 0;
        setTimeout(async () => {
            while (this.spin) {
                let spinnerChar = this.spinnerCharacters[spinnerIndex % this.spinnerCharacters.length];
                spinnerIndex++;
                let newItem = `${this.lineWithoutSpinner} ${spinnerChar}`;
                this.panel.deleteLine(this.panel.getScrollHeight() - 1);
                this.panel.pushLine(newItem);
                this.panel.setScrollPerc(100);
                this.screen.render();
                await delay(100);
            }
        }, 0);
    }

    stop() {
        this.spin = false;
        this.panel.deleteLine(this.panel.getScrollHeight() - 1);
        this.panel.pushLine(this.lineWithoutSpinner);
        this.panel.setScrollPerc(100);
        this.screen.render();
    }
}

module.exports = Spinner;
