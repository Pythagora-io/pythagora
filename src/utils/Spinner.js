const { delay } = require("./common");
const { bold, yellow, reset } = require('./cmdPrint').colors;

class Spinner {
    constructor(panel, screen) {
        this.spin = false;
        this.spinnerCharacters = ['-', '\\', '|', '/'];
        this.panel = panel;
        this.screen = screen;
    }

    start(tree, index) {
        let spinnerIndex = 0;
        this.spin = true;
        setTimeout(async () => {
            while (this.spin) {
                spinnerIndex++;
                this.rewriteTree(tree, index, spinnerIndex)
                await delay(100);
            }
        }, 0);
    }

    rewriteTree(tree, index, spinnerIndex) {
        this.panel.setContent('');
        let spinnerChar = this.spinnerCharacters[spinnerIndex % this.spinnerCharacters.length];
        for (let i = 0; i < tree.length; i++) {
            if (i === index) {
                this.panel.pushLine(`${bold}${yellow}${tree[i].line} ${spinnerChar}${reset}`);
            } else {
                this.panel.pushLine(tree[i].line);
            }
        }
        this.panel.scrollTo(Math.max(index - Math.round(this.panel.height*2/3), 0));
        this.screen.render();
    }

    async stop() {
        this.spin = false;
        await delay(100);
    }
}

module.exports = Spinner;
