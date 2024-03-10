const { delay } = require('./common');
const { bold, yellow, reset } = require('./cmdPrint').colors;

class Spinner {
  constructor(panel, screen, options = {}) {
    this.spin = false;
    this.spinnerCharacters = options.spinnerCharacters || ['-', '\\', '|', '/'];
    this.delay = options.delay || 100;
    this.panel = panel;
    this.screen = screen;
  }

  start(tree, index) {
    this.spin = true;

    const spinAnimation = async () => {
      let spinnerIndex = 0;
      while (this.spin) {
        spinnerIndex++;
        this.rewriteTree(tree, index, spinnerIndex);
        await delay(this.delay);
      }
    };

    // Start the spinner animation.
    spinAnimation().catch((error) => {
      console.error('Spinner error:', error);
    });
  }

  rewriteTree(tree, index, spinnerIndex) {
    this.panel.setContent('');
    const spinnerChar = this.spinnerCharacters[spinnerIndex % this.spinnerCharacters.length];
    tree.forEach((item, i) => {
      const line = i === index ? `${bold}${yellow}${item.line} ${spinnerChar}${reset}` : item.line;
      this.panel.pushLine(line);
    });

    this.panel.scrollTo(Math.max(index - Math.round(this.panel.height * 2 / 3), 0));
    this.screen.render();
  }

  async stop() {
    this.spin = false;
    await delay(this.delay);
  }
}

module.exports = Spinner;
