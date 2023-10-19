<p align=center>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/10895136/228003796-7e3319ad-f0b1-4da9-a2d0-6cf67ccc7a32.png">
    <img height="200px" alt="Pythagora Logo" src="https://user-images.githubusercontent.com/10895136/228003796-7e3319ad-f0b1-4da9-a2d0-6cf67ccc7a32.png">
  </picture>
</p>
<h2 align="center">Pythagora is on a mission to make automated tests<br>🤖 fully autonomous 🤖</h2>
<h3 align="center">Just run one command and watch the tests being created with GPT-4</h3>
<br>

The following details are for generating unit tests. To view the docs on how to generate **integration tests**, click [here](./src/docs/integration/README.md).

<br>

# <img src="https://s3.amazonaws.com/assets.pythagora.ai/vscode/vscode_icon.png" alt="Visual Studio Code Logo" width="24" height="24"> Visual Studio Code Extension

If you want to try out Pythagora using Visual Studio Code extension you can download it <a href="https://marketplace.visualstudio.com/items?itemName=PythagoraTechnologies.pythagora-vscode-extension">here</a>.

# 🏃💨️ Quickstart

To install Pythagora run:
```bash
npm i pythagora --save-dev
```
Then, [add your API key](#%EF%B8%8F-config) and you're ready to get tests generated. After that, just run the following command from the root directory of your repo:

```bash
npx pythagora --unit-tests --func <FUNCTION_NAME>
```

Where `<FUNCTION_NAME>` is the name of the function you want to generate unit tests for. Just make sure that your function is exported from a file. You can see other options like generating tests for multiple files or folders [below in the Options section](#-options).

<br><br>
If you wish to expand your current test suite with more tests to get better code coverage you can run:

```bash
npx pythagora --expand-unit-tests --path <PATH_TO_YOUR_TEST_SUITE>
```
for more details on expanding existing tests see [below in the Expanding existing tests section](#-expand-existing-tests).

<br><br>

**NOTE:** on Windows make sure to run all commands using `Git Bash` and not `Power Shell` or anything similiar

<br>

# 🎞 Demo

Here are some demo videos that can help you get started.
<div align="center">
  <a href="https://youtu.be/NNd08XgFFw4"><img src="https://github-production-user-asset-6210df.s3.amazonaws.com/10895136/244031887-02f19eb9-dba1-4e62-a670-744c7d3423ae.gif" alt="Pythagora Alpha Demo"></a>
</div>
<p align=center>
  <a target="_blank" href="https://youtu.be/NNd08XgFFw4">Pythagora Unit Tests Demo (2 min)</a>
</p>
<br>

# 🔎 Examples

Here are examples of open sourced repositories that we forked and created tests with Pythagora so you can easily see it in action. 

- [Lodash](https://github.com/Pythagora-io/pythagora-demo-lodash)
  - 📝 1604 tests generated
  - 🐞 11 bugs found (1 edge case and 10 bugs)
  - ⏳️ 4 hour run time

  ![lodash pythagora tests results](https://github.com/Pythagora-io/pythagora/assets/10895136/c0a2a589-e3ef-4812-9ea2-545307fd1a1d)


- [node-fs-extra](https://github.com/Pythagora-io/pythagora-demo-node-fs-extra)
  - 📝 98 tests generated
  - 🐞 2 bugs found
  - ⏳️ 30 minutes run time
 
  ![node-fs-extra pythagora tests results](https://github.com/Pythagora-io/pythagora/assets/10895136/a3d8ec9e-2881-4b97-9d95-57440c1932e4)

<br>

# 🔬 How does it work?
When Pythagora generates unit tests, it uses the following approach:
1. Find the function you want to test
2. Find all the functions that are called from within that function
  - This is done with AST (Abstract Syntax Tree) parsing
3. Send the function you want to test and all the related functions to the Pythagora server which then generates the unit tests with GPT-4
  - the Pythagora server is open sourced as well [here](https://github.com/Pythagora-io/api)
  - You can find the prompts [in this folder](https://github.com/Pythagora-io/api/tree/main/prompts) on the Pythagora server
    
<br>

# 📈 Expand existing tests
If you already have generated tests for your codebase but you just want to increase your code coverage or cover more edge cases, simply run:

```bash
npx pythagora --expand-unit-tests --path <PATH_TO_YOUR_TEST_SUITE>
```
When running command `PATH_TO_YOUR_TEST_SUITE` can be path to a single test file or to a folder and all test files inside of that folder will be processed and expanded.

That's all, enjoy your new code coverage!

# 📖 Options
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

<br>

# ⚙️ Config
Pythagora uses GPT-4 to generate tests so you either need to have OpenAI API Key or Pythagora API Key. You can get your [Pythagora API Key here](https://mailchi.mp/f4f4d7270a7a/api-waitlist) or [OpenAI API Key here](https://platform.openai.com/account/api-keys). Once you have it, add it to Pythagora with:
```bash
npx pythagora --config --pythagora-api-key <API_KEY>
```
or
```bash
npx pythagora --config --openai-api-key <API_KEY>
```
<br>

# ▶️ How to run unit tests
To run the generated tests, you can simply run
```bash
npx jest ./pythagora_tests/
```
or to run tests from a specific file or a folder, run `npx jest <PATH_TO_FILE_OR_FOLDER>`. Currently, Pythagora supports only generating Jest tests but if you would like it to generate tests in other frameworks, let us know at [hi@pythagora.ai](mailto:hi@pythagora.ai).

<br>

# 📌️ Notes

- The best unit tests that Pythagora generates are the ones that are standalone functions (eg. helpers). Basically, the parts of the code that actually can be unit tested. For example, take a look at this [Pythagora file](./src/utils/common.js) - it contains helper functions that are a perfect candidate for unit tests. When we ran `npx pythagora --unit-tests --path ./src/utils/common.js` - it generated 145 tests from which only 17 failed. What is amazing is that only 6 tests failed because they were incorrectly written and the other 11 tests caught bugs in the code itself. You can view these tests [here](./pythagora_tests/unit/src/utils/common/).
- We don't store any of your code on our servers. However, the code is being sent to GPT and hence OpenAI. Here is their [privacy policy](https://openai.com/policies/privacy-policy).
- a function you want to generate tests for needs to be exported from the file. For example, if you have a file like this:
  ```javascript
  function mongoObjToJson(originalObj) {
      ...
  }
  
  module.exports = {
      mongoObjToJson
  };
  ```
  
  Then, to generate unit tests for the `mongoObjToJson` function, you can run:
  ```bash
  npx pythagora --unit-tests --func mongoObjToJson
  ```

<br>

# 🤔️ FAQ

- **How accurate are these tests?**
  - The best unit tests that Pythagora generates are the ones that are standalone functions. Basically, the parts of the code that actually can be unit tested. For example, take a look at this [Pythagora file](./src/utils/common.js) - it contains helper functions that are a perfect candidate for unit tests. When we ran `npx pythagora --unit-tests --path ./src/utils/common.js` - it generated 145 tests from which only 17 failed. What is amazing is that only 6 tests failed because they were incorrectly written and the other 11 tests caught bugs in the code itself. You can view these tests [here](./pythagora_tests/unit/src/utils/common/).
  - Here are a couple of observations we've made while testing Pythagora:
    1. It does a great job at testing edge cases. For many repos we created tests for, the tests found bugs right away by testing edge cases.
    2. It works best for testing standalone helper functions. For example, we tried generating tests for the Lodash repo and it create 1000 tests from which only 40 needed additional review. For other, non standalone functions, we're planning to combine recordings from integration tests to generate proper mocks so that should expand Pythagora's test palette.
    3. It's definitely not perfect but the tests it created I wanted to keep and commit them. So, I encourage you to try it out and see how it works for you. If you do that, please let us know via [email](mailto:hi@pythagora.ai) or [Discord](https://discord.gg/npC5TAfj6e). We're super excited to hear how it went for you.
<br><br>
- **Should I review generated tests?**
  - Absolutely. As mentioned above, some tests might be incorrectly written so it's best for you to review all tests before committing them. Nevertheless, I think this will save you a lot of time and will help you think about your code in a different way.
<br><br>
- **Tests help me think about my code - I don't want to generate them automatically**
    - That's the best thing about Pythagora - it actually does help you think about the code. Just, you don't need to spend time writing tests. This happened to us, who created Pythagora - we coded it as fast as possible but when we added unit test generation, we realized that it cannot create tests for some functions. So, we refactored the code and made it more modular so that unit tests can be generated for it. 
<br><br>
- **Is Pythagora limited to a specific programming language or framework?**
  - Pythagora primarily generates unit tests for JavaScript code. However, it's designed to work with code written in JavaScript, TypeScript, and similar languages. If you'd like to see support for other languages or frameworks, please let us know at hi@pythagora.ai.
<br><br>

- **Can Pythagora generate integration tests as well?**
  - Pythagora is currently focused on generating unit tests. For generating integration tests, you might need to combine the recordings from integration tests to generate proper mocks. We are actively exploring options to expand its capabilities in the future.
<br><br>

- **Is Pythagora compatible with all JavaScript testing frameworks?**
  - Currently, Pythagora generates tests using the Jest testing framework. While we are open to expanding compatibility to other testing frameworks, Jest is the primary framework supported at the moment. If you have a specific framework in mind, feel free to share your suggestions with us.
<br><br>

- **How does Pythagora handle sensitive or proprietary code?**
  - Pythagora doesn't store your code on its servers, but it sends code to GPT and OpenAI for test generation. It's essential to review the generated tests, especially if your code contains sensitive or proprietary information, before committing them to your repository. Be cautious when using Pythagora with sensitive code.
<br><br>

- **Is Pythagora suitable for all types of projects?**
  - Pythagora works best for projects with well-structured code and standalone functions (such as helper functions). It excels at generating tests for these types of code. For more complex or non-standalone functions, manual review and modifications may be necessary.



# 🏁 Alpha version
This is an alpha version of Pythagora. To get an update about the beta release or to give a <b>suggestion on tech (framework / database) you want Pythagora to support</b> you can 👉 <a href="http://eepurl.com/ikg_nT" target="_blank">add your email / comment here</a> 👈 .
<br>

# 🔗 Connect with us
💬 Join the discussion on <a href="https://discord.gg/npC5TAfj6e" target="_blank">our Discord server</a>.
<br><br>
📨 Get updates on new features and beta release by <a href="http://eepurl.com/ikg_nT" target="_blank">adding your email here</a>.
<br><br>
🌟 As an open source tool, it would mean the world to us if you starred the Pythagora repo 🌟
<br><br>
<br><br>

<br><br>

