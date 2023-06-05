<p align=center>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/10895136/228003796-7e3319ad-f0b1-4da9-a2d0-6cf67ccc7a32.png">
    <img height="200px" alt="Pythagora Logo" src="https://user-images.githubusercontent.com/10895136/228003796-7e3319ad-f0b1-4da9-a2d0-6cf67ccc7a32.png">
  </picture>
</p>
<h2 align="center">Pythagora is on a mission to make automated tests<br>🤖 fully autonomous 🤖</h2>
<h3 align="center">Currently it can generate <a href="#unit-tests">Unit tests</a> and <a href="./src/docs/integration/">Integration tests</a></h3>
<br>

To view the docs on how to generate **integration tests**, click [here](./src/docs/integration/README.md). The following details are for generating unit tests.

<h1 id="setup">🏃💨️ Quickstart</h1>

To integrate Pythagora into your Node.js app, you just need to install the pythagora package
   <br>
   ```bash
   npm install pythagora
   ```
   And that's it! Now, you just need to run the following command from the root directory of your repo:

```bash
npx pythagora --unit-tests --func <FUNCTION_NAME>
```

Where `<FUNCTION_NAME>` is the name of the function you want to generate unit tests for.

For example, if you have a file like this:
```javascript
function mongoObjToJson(originalObj) {
    ...
}

module.exports = {
    mongoObjToJson
};
```

Then, to generate unit tests for the `mongoObjToJson` function, you would run:
```bash
npx pythagora --unit-tests --func mongoObjToJson
```

## ⚙️ Config
Pythagora uses GPT-4 to generate tests so you either need to have OpenAI API Key or Pythagora API Key. You can get your [Pythagora API Key here](https://mailchi.mp/f4f4d7270a7a/api-waitlist) or [OpenAI API Key here](https://platform.openai.com/account/api-keys). Once you have it, add it to Pythagora with:
```bash
npx pythagora --config --pythagora-api-key <API_KEY>
```
or
```bash
npx pythagora --config --openai-api-key <API_KEY>
```

## 🔬How does it work?
When pythagora generates unit tests, it uses the following approach:
1. It finds the function you want to test
2. It finds all the functions that are called from the function you want to test
   - This is done with AST (Abstract Syntax Tree) parsing
3. It sends the function you want to test and all the functions that are called from it to the Pythagora server which then generates the unit tests with GPT-4
   - Pythagora server is open sourced as well [here](https://github.com/Pythagora-io/api)
   - You can find the prompts we're using [in this folder](https://github.com/Pythagora-io/api/tree/main/prompts) on Pythagora server

## ▶️ How to run unit tests
To run the generated tests, you can simply run `npx jest` or to run tests from a specific file or a folder, run `npx jest <PATH_TO_FILE_OR_FOLDER>`. Currently, Pythagora supports only generating Jest tests but if you would like it to generate tests in other frameworks, let us know at [hi@pythagora.ai](mailto:hi@pythagora.ai).


## 📖 Options
- To generate unit tests for **one single function**, run:

    ```bash
    npx pythagora --unit-tests --func <FUNCTION_NAME>
    ```

- To generate unit tests for **one single function** in a specific file, run:

    ```bash
    npx pythagora --unit-tests --func <FUNCTION_NAME> --path ./path/to/file.js
    ```

- To generate unit tests for **all functions in a file**, run:

    ```bash
    npx pythagora --unit-tests --path ./path/to/file.js
    ``` 

- To generate unit tests for **all functions in all files in a folder**, run:

    ```bash
    npx pythagora --unit-tests --path ./path/to/folder/
    ```

<br><br>
<h1 id="demo">🎞 Demo</h1>

Here are some demo videos that can help you get started.
<div align="center">
  <a href="https://youtu.be/YxzvljVyaEA"><img src="https://user-images.githubusercontent.com/10895136/217778681-bce3186f-c92d-4861-94cd-ad8bad29a2ff.gif" alt="Pythagora Alpha Demo"></a>
</div>

<h3 align="center">🎞️ ▶️  Video resources ▶️ 🎞️</h3>
<p align=center>
  <a target="_blank" href="https://youtu.be/YxzvljVyaEA">Pythagora Demo (4 min)</a>
  <br>
  <a target="_blank" href="https://www.youtube.com/watch?v=kHbwX4QVoGY">Generate Jest tests with Pythagora and GPT-4 (4 min)</a>
</p>

<br><br>
<h1 id="commands">🔎 Examples</h1>
Here are examples of open sourced repositories which we forked and created tests with Pythagora so you can easily see it in action. 

[![MERN E-commerce](https://img.shields.io/badge/MERN%20E--commerce-https%3A%2F%2Fgithub.com%2FPythagora--io%2Fpythagora--demo--mern--ecommerce-green?style=for-the-badge)](https://github.com/Pythagora-io/pythagora-demo-mern-ecommerce)
[![Reddish](https://img.shields.io/badge/Reddish-https%3A%2F%2Fgithub.com%2FPythagora--io%2Fpythagora--demo--reddish-green?style=for-the-badge)](https://github.com/Pythagora-io/pythagora-demo-reddish)
[![Trellis](https://img.shields.io/badge/Trellis-https%3A%2F%2Fgithub.com%2FPythagora--io%2Fpythagora--demo--trellis-green?style=for-the-badge)](https://github.com/Pythagora-io/pythagora-demo-trellis)


<br><br>
<h1 id="support">🤔️ FAQ</h1>

- **How accurate are these tests?**
  - The best unit tests that Pythagora generates are the ones that are standalone functions. Basically, the parts of the code that actually can be unit tested. For example, take a look at this [Pythagora file](./src/utils/common.js) - it contains helper functions that are a perfect candidate for unit tests. When we ran `npx pythagora --unit-tests --path ./src/utils/common.js` - it generated 145 tests from which only 17 failed. What is amazing is that only 6 tests failed because they were incorrectly written and other 11 tests caught bugs in the code itself. You can view these tests [here](./pythagora_tests/unit/src/utils/common/).
<br><br>
- **Should I review generated tests?**
  - Absolutely. As mentioned above, some tests might be incorrectly written so it's best for you to review all tests before committing them. Nevertheless, I think this will save you a lot of time and will help you think about your code in a different way.
<br><br>
- **Tests help me think about my code - I don't want to generate them automatically**
    - That's the beauty of Pythagora - you can use it as a tool to help you think about your code. You can generate tests and then modify them to your liking. You can also use Pythagora to generate tests for your code and then delete them. Whenever you think about a code unit you want to test, you will need to write an independent function for that unit and place it in the appropriate file so that it can be imported into a test. This actually helped us, who are working on Pythagora, to refactor the unit tests feature so that we can generate tests for it.

<br>
<h1 id="alphaversion">🏁 Alpha version</h1>
This is an alpha version of Pythagora. To get an update about the beta release or to give a <b>suggestion on tech (framework / database) you want Pythagora to support</b> you can 👉 <a href="http://eepurl.com/ikg_nT" target="_blank">add your email / comment here</a> 👈 .
<br>
<br>
<h1 id="connectwithus">🔗 Connect with us</h1>
💬 Join the discussion on <a href="https://discord.gg/npC5TAfj6e" target="_blank">our Discord server</a>.
<br><br>
📨 Get updates on new fetures and beta release by <a href="http://eepurl.com/ikg_nT" target="_blank">adding your email here</a>.
<br><br>
⭐ Star this repo to show support.
<br><br>
<br><br>

<br><br>

