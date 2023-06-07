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

# 🏃💨️ Quickstart

To integrate Pythagora you just run:
```bash
npm i pythagora --save-dev
```
And that's it! Now, you can run the following command from the root directory of your repo:

```bash
npx pythagora --unit-tests --func <FUNCTION_NAME>
```

Where `<FUNCTION_NAME>` is the name of the function you want to generate unit tests for. Just make sure that your function is exported from a file. You can see other options like generating tests for multiple files or folders [below in the Options section](#-options).

<br>

# 🎞 Demo

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

<br>

# 🔎 Examples

Here are examples of open sourced repositories that we forked and created tests with Pythagora so you can easily see it in action. 

- [Lodash](https://github.com/Pythagora-io/pythagora-demo-lodash)
  - 📝 1604 tests generated
  - 🐞 13 bugs found (3 edge cases and 10 bugs)
  - ⏳️ 4 hour run time

  ![lodash pythagora tests results](https://github.com/Pythagora-io/pythagora/assets/10895136/c0a2a589-e3ef-4812-9ea2-545307fd1a1d)


- [node-fs-extra](https://github.com/Pythagora-io/pythagora-demo-node-fs-extra)
  - 📝 109 tests generated
  - 🐞 12 bugs found
  - ⏳️ 30 minutes run time
 
  ![node-fs-extra pythagora tests results](https://github.com/Pythagora-io/pythagora/assets/10895136/2026b9c1-968b-4a13-8614-20a961693657)

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
- **What tests are the best**
    - That's the best thing about Pythagora - it actually does help you think about the code. Just, you don't need to spend time writing tests. This happened to us, who created Pythagora - we coded it as fast as possible but when we added unit test generation, we realized that it cannot create tests for some functions. So, we refactored the code and made it more modular so that unit tests can be generated for it. 

<br>

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

