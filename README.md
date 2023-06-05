<p align=center>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/10895136/228003796-7e3319ad-f0b1-4da9-a2d0-6cf67ccc7a32.png">
    <img height="200px" alt="Pythagora Logo" src="https://user-images.githubusercontent.com/10895136/228003796-7e3319ad-f0b1-4da9-a2d0-6cf67ccc7a32.png">
  </picture>
</p>
<h2 align="center">Pythagora is on a mission to make automated tests<br>✊ fully autonomous ✊</h2>
<h3 align="center">Currently it can generate <a href="#unit-tests">Unit tests</a> and <a href="#integration-tests">Integration tests</a></h3>
<p align="center">🌟 As an open source tool, it would mean the world to us if you starred Pythagora repo 🌟<br>🙏 Thank you 🙏</p>
<br>

<h1 id="setup">⚙️ Installation</h1>

To integrate Pythagora into your Node.js app, you just need to install the pythagora package
   <br>
   ```bash
   npm install pythagora
   ```
   And that's it - no config or setup! You are ready to start generating automated tests for your repo!
   <br>
   <br>

<h1 id="demo">🎞 Demo</h1>

Here are some demo videos that can help you get started.
<div align="center">
  <a href="https://youtu.be/YxzvljVyaEA"><img src="https://user-images.githubusercontent.com/10895136/217778681-bce3186f-c92d-4861-94cd-ad8bad29a2ff.gif" alt="Pythagora Alpha Demo"></a>
</div>

<h3 align="center">🎞️ ▶️  Video resources ▶️ 🎞️</h3>
<p align=center>
  <a target="_blank" href="https://youtu.be/YxzvljVyaEA">Pythagora Unit Tests Demo (3 min)</a>
  <br>
  <a target="_blank" href="https://youtu.be/YxzvljVyaEA">Pythagora Integration Tests Demo (4 min)</a>
  <br>
  <a target="_blank" href="https://www.youtube.com/watch?v=kHbwX4QVoGY">Export integration tests to Jest with GPT-4 (4 min)</a>
  <br>
  <a target="_blank" href="https://youtu.be/ferEJsqBHqw">Pythagora Tech Deep Dive (16 min)</a>
  <br>
  <a target="_blank" href="https://youtu.be/opQP8NMCiPw">Dev Workflow With Pythagora (4 min)</a>
</p>

<br><br>
<h1 id="commands">🔎 Examples</h1>
Here are examples of open sourced repositories which we forked and created tests with Pythagora so you can easily see it in action. 

[![MERN E-commerce](https://img.shields.io/badge/MERN%20E--commerce-https%3A%2F%2Fgithub.com%2FPythagora--io%2Fpythagora--demo--mern--ecommerce-green?style=for-the-badge)](https://github.com/Pythagora-io/pythagora-demo-mern-ecommerce)
[![Reddish](https://img.shields.io/badge/Reddish-https%3A%2F%2Fgithub.com%2FPythagora--io%2Fpythagora--demo--reddish-green?style=for-the-badge)](https://github.com/Pythagora-io/pythagora-demo-reddish)
[![Trellis](https://img.shields.io/badge/Trellis-https%3A%2F%2Fgithub.com%2FPythagora--io%2Fpythagora--demo--trellis-green?style=for-the-badge)](https://github.com/Pythagora-io/pythagora-demo-trellis)


<br><br>
<details><summary><h1 id="unit-tests">👉 Unit tests 🏠</h1></summary>

## 🎥 How to generate unit tests
To generate unit tests with Pythagora, you just need to run 1 single command from the root directory of your Node.js app.

```bash
npx pythagora --unit-tests --func <FUNCTION_NAME>
```

## 🔬How does it work?
When pythagora generates unit tests, it uses the following approach:
1. It finds the function you want to test
2. It finds all the functions that are called from the function you want to test
   - This is done with AST (Abstract Syntax Tree) parsing
3. It sends the function you want to test and all the functions that are called from it to the Pythagora server which then generates the unit tests with GPT-4
   - Pythagora server is open sourced as well [here](https://github.com/Pythagora-io/api)
   - You can find the prompts we're using [in this folder](https://github.com/Pythagora-io/api/tree/main/prompts) on Pythagora server

## ▶️ How to run the generated unit tests
To run the generated tests, you can simply run `npx jest` or to run tests from a specific file or a folder, run `npx jest <PATH_TO_FILE_OR_FOLDER>`. Currently, Pythagora supports only generating Jest tests but if you would like it to generate tests in other frameworks, let us know at [hi@pythagora.ai](mailto:hi@pythagora.ai).


## 📖 Other options
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

</details>
   <br>
   <br>

<details><summary><h1 id="integration-tests">👉 Integration tests 🏢</h1></summary>
<h1 id="capturingtests">🎥 Capturing tests</h1>

Pythagora records all requests to endpoints of your app with the response and everything that's happening during the request. Currently, that means all Mongo and Redis queries with responses (in the future 3rd party API requests, disk IO operations, etc.). Then, when you run the tests, Pythagora can simulate the server conditions from the time when the request was captured.

1. <b>From the root directory</b> run Pythagora in a capture mode first to capture test data and mocks.
   <br>
      ```bash
      npx pythagora --init-command "my start command" --mode capture
      ```
   Eg. if you start your Node.js app with `nest start` then the command would be:
   <br>
      ```bash
      npx pythagora --init-command "nest start" --mode capture
      ```
2. Click around your application or make requests to your API. Pythagora will capture all requests and responses.
<br><br>
<b>NOTES: </b>
- to stop the capture, you can exit the process like you usually do (Eg. `Ctrl + C`)
- on Windows make sure to run all commands using `Git Bash` and not `Power Shell` or anything similiar

<br>
<br>
<h1 id="executingtests">▶️ Running tests</h1>
When running tests, it doesn’t matter what database is your Node.js connected to or what is the state of that database. Actually, that database is never touched or used —> instead, Pythagora creates a special, ephemeral pythagoraDb database, which it uses to restore the data before each test is executed, which was present at the time when the test was recorded. Because of this, tests can be run on any machine or environment.

**If a test does an update to the database, Pythagora also checks the database to see if it was updated correctly.**

So, after you captured all requests you want, you just need to change the mode parameter to `--mode test` in the Pythagora command.
<br>
   ```bash
   npx pythagora --init-command "my start command" --mode test
   ```   

<br><br>
<p align=center>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://github.com/Pythagora-io/pythagora/assets/10895136/41f349ec-c6fe-4357-8c92-db09b88d2b8e">
    <img height="100px" alt="OpenAI logo" src="https://github.com/Pythagora-io/pythagora/assets/10895136/41f349ec-c6fe-4357-8c92-db09b88d2b8e">
  </picture>
</p>
<h1 id="exportjest">🤖 ️Generate Jest tests with Pythagora and GPT-4</h1>

You can export any Pythagora test to Jest with GPT-4. To see how it works, you can watch [the full demo video here](https://www.youtube.com/watch?v=kHbwX4QVoGY).

## What are Jest integration tests made of

- **Database setup** (before a test is run)
  - during the export to Jest, Pythagora saves all database documents in the `pythagora_tests/exported_tests/data` folder as a JSON file
  - in the `beforeEach` function, these documents are restored into the database so that the database is in the same state as it was when the test was recorded
  - Pythagora has built-in functions to work with the database but in case you want to use your own and completely separate Jest tests from Pythagora, use the `global-setup.js` file in which you can set up your own ways to populate the database, get a collection and clear the database
- **User authentication** (when the endpoint requires authentication)
  - the first time you run the export, Pythagora will create `auth.js` file
  - it is used inside `beforeEach` function to retrieve the authentication token so that API requests (that require authentication) can be executed
- **Test**
  - tests check the response from the API and if the database is updated correctly

## How to export Pythagora tests to Jest

1. First, you need to tell Pythagora what is the login endpoint. You can do that by running:

    ```bash
    npx pythagora --export-setup
    ```
   
2. After that, just run Pythagora capture command and log into the app so the login route gets captured.

    ```bash
    npx pythagora --init-command "my start command" --mode capture
    ``` 

3. Exporting to Jest is done with GPT-4 so you either need to have OpenAI API key with GPT-4 access or a Pythagora API key which you can get [here](https://mailchi.mp/f4f4d7270a7a/api-waitlist). Once you have the API key, you're ready to export tests to Jest by running:

    ```bash
    npx pythagora --export --test-id <TEST_ID> --openai-api-key <YOUR_OPENAI_API_KEY>
    ```
   or
    ```bash
    npx pythagora --export --test-id <TEST_ID> --pythagora-api-key <YOUR_PYTHAGORA_API_KEY>
    ```
   
4. To run the exported tests, run:
    
    ```bash
    npx pythagora --mode jest
    ```

Exported tests will be available in the `pythagora_tests/exported_tests` folder.

NOTE: Pythagora uses GPT-4 8k model so some tests that do too many things during the processing might exceed the 8k token limit. To check which tests you can export to Jest, you can run:

```bash
npx pythagora --tests-eligible-for-export
```

<br>
<br>

<h1 id="commands">🔧 Maintenance / update of tests</h1>

Sometimes tests failing is expected behaviour if the code behaviour is updated. In those cases, tests need to be updated. Pythagora provides a git like interface where you can review
all changes that are breaking the test and easily (A)ccept them if they are expected or (D)elete the test if you think it's invalid. To start the review process, just run the Pythagora command with `--review` flag.
<br><br>
```bash
npx pythagora --review
```

You can watch the [workflow with Pythagora video](https://www.youtube.com/watch?v=opQP8NMCiPw) in which I go deeper into details of the review process.
<br><br>

<h1 id="commands">❌ Deleting tests</h1>

If you made some bigger changes to the repo and you want to rewrite many tests, you can delete all of them with `--delete-all-failed` flag.
<br><br>

```bash
npx pythagora --delete-all-failed
```
<br>

If you want to delete only one test using testId you can use
<b>--delete testId</b> like this:
   ```bash
   npx pythagora --delete testId
   ```
<br>

<h1 id="options">📖 Other Options</h1>

These are available options for Pythagora command:
<br><br><br>
<b>--rerun-all-failed</b> (runs again only tests that failed in previous run)
   ```bash
   npx pythagora --init-command "my start command" --mode test --rerun-all-failed
   ```
<br>

<b>--test-id</b> (runs test by Id)
   ```bash
   npx pythagora --init-command "my start command" --mode test --test-id testId
   ```
<br>

<b>--pick endpoint1 endpoint2</b> (starts capturing only listed endpoints)
   ```bash
   npx pythagora --init-command "my start command" --mode capture --pick /endpoint1 /endpoint2
   ```
<br>

<b>--ignore endpoint1 endpoint2</b> (starts capturing but ignores all listed endpoints)
   ```bash
   npx pythagora --init-command "my start command" --mode capture --ignore /endpoint1 /endpoint2
   ```

<br><br>
<h1 id="codecoveragereport">📝 Code Coverage Report</h1>

Code coverage is a great metric while building automated tests as it shows us which lines of code are covered by the tests. Pythagora uses `nyc` to generate a report about code that was covered with Pythagora tests. By default, Pythagora will show you the basic code coverage report summary when you run tests.
<br>
<br>

If you want to generate a more detailed report, you can do so by running Pythagora with `--full-code-coverage-report` flag. Eg.
   ```bash
   npx pythagora --init-command "my start command" --mode test --full-code-coverage-report
   ```
You can find the code coverage report inside `pythagora_tests` folder in the root of your repository. You can open the HTML view of the report by opening `pythagora_tests/code_coverage_report/lcov-report/index.html`.

<br>

In case you don't want the code coverage to be shown at all while running tests, you can run the tests with `--no-code-coverage` parameter. This is helpful
during debugging process since the code coverage report can clash with your IDE's debugger.

<br><br>
<h1 id="authentication"> 🔑 Authentication</h1>
For authentication we support <a href="https://www.npmjs.com/package/jsonwebtoken" target="_blank">JWT</a>, sessions stored in
<a href="https://redis.io/" target="_blank">Redis</a> and sessions stored in <a href="https://www.npmjs.com/package/mongodb" target="_blank">MongoDB</a>.
First 2 cases cases (JWT and sessions stored in Redis) should work just fine without
any additional implementation but for session that are stored in MongoDB you need to add this one line of code:

```javascript
if (global.Pythagora) global.Pythagora.authenticationMiddleware = true;
```
just before your authentication middleware. For example, if you are using <a href="https://www.npmjs.com/package/express-session" target="_blank">express-session</a>
you would have to add our line of code just above your middleware that is managing sessions in your DB, like this:

```javascript
if (global.Pythagora) global.Pythagora.authenticationMiddleware = true;

app.use(session({
    secret: 'my-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 60 * 60 * 1000
    },
    store: MongoStore.create({
        mongoUrl: mongourl,
        mongoOptions: {
            useNewUrlParser: true,
            useUnifiedTopology: true
        }
    })
}));
```
That's it! You are ready to go and all your API requests with authentication should PASS!

<br><br>
<h1 id="testdata">🗺️️ Where can I see the tests?</h1>
Each captured test is saved in <strong><i>"pythagora_tests"</i></strong> directory at the root of your repository.
<br><br>
<details><summary style="background-color: grey; padding: 10px; border: none; border-radius: 4px; cursor: pointer;">Click here to see "pythagora_tests" folder structure explanation:</summary>

<ul>
  <li>pythagora_tests
    <ul>
      <li>exported_tests <span style="color: green;">// folder containing all exported Jest tests</span>
        <ul>
          <li>data <span style="color: green;">// folder containing Jest test data</span>
            <ul>
              <li>JestTest1.json <span style="color: green;">// this is data that is populated in DB for JestTest1.test.js</span></li>
              <li>JestTest2.json <span style="color: green;">// this is data that is populated in DB for JestTest2.test.js</span></li>
              <li>...</li>
            </ul>
          </li>
          <li>auth.js <span style="color: green;">// here is authentication function that is used in all Jest tests</span></li>
          <li>global-setup.js<span style="color: green;"> // Jest global setup if you want to use your own functions for running Jest tests</span></li>
          <li>JestTest1.test.js <span style="color: green;">// this is an exported Jest test</span></li>
          <li>JestTest2.test.js</li>
          <li>...</li>
        </ul>
      </li>
      <li>pythagoraTest1.json <span style="color: green;">// this is a Pythagora test</span></li>
      <li>pythagoraTest2.json</li>
      <li>...</li>
    </ul>
  </li>
</ul>
</details>
<br><br>
Each JSON file in this repository represents one endpoint that was captured and each endpoint can have many captured tests.
If you open these files, you will see an array in which each object represents a single test. All data that's needed to run a test
is stored in this object. Here is an example of a test object.
<br><br>
<details><summary style="background-color: grey; padding: 10px; border: none; border-radius: 4px; cursor: pointer;">Click here to see example of one recorded Pythagora test:</summary>

```json
{
   "id": "b47cbee2-4a47-4b2c-80a0-feddae3081b3",
   "endpoint": "/api/boards/", // endpoint that was called
   "body": {}, // body payload that was sent with the request
   "query": {}, // query params that were sent with the request
   "params": {}, // params that were sent with the request
   "method": "GET", // HTTP method that was used
   "headers": { // headers that were sent with the request
      "x-forwarded-host": "localhost:3000",
      ...
   },
   "statusCode": 200, // status code that was returned
   "responseData": "...", // response data that was received
   "intermediateData": [ // server activity that was captured during the request
      {
         "type": "mongodb", // type of the activity - mongo query in this case
         "op": "findOneAndUpdate",
         "db": "ecomm",
         "collection": "users",
         "query": { // mongo match query that was executed
            "_id": "ObjectId(\"63f5e8272c78361761e9fcf1\")"
         },
         "otherArgs": {
            "update": { // data that needs to be updated
               "$set": {
                  "name": "Steve",
                  ...
               }
            },
            ...
         },
         "options": {
            "upsert": false,
            ...
         },
         "preQueryRes": [ // data that was present in the database before the query was executed
            {
               "_id": "ObjectId(\"63f5e8272c78361761e9fcf1\")",
               "name": "Michael",
               ...
            }
         ],
         "mongoRes": [ // data that was returned by the query
            {
               "_id": "ObjectId(\"63f5e8272c78361761e9fcf1\")",
               "name": "Steve",
               ...
            }
         ],
         "postQueryRes": [ // data that was present in the database after the query was executed
            {
               "_id": "ObjectId(\"63f5e8272c78361761e9fcf1\")",
               "name": "Steve",
               ...
            }
         ]
      }
   ],
   "createdAt": "2023-02-22T14:57:52.362Z" // date when the test was captured
}
```

</details>
<br><br>
<h1 id="support">⛑️ Support</h1>

For now, we support projects that use:
- <a href="https://www.npmjs.com/package/express" target="_blank">Express</a> (it can be used explicitly or under the hood, like in <a href="https://www.npmjs.com/package/@apollo/server" target="_blank">Apollo server</a> or <a href="https://nestjs.com/" target="_blank">NestJS</a>)
- <a href="https://www.npmjs.com/package/mongodb" target="_blank">MongoDB</a> (same as express, it can be used explicitly or under the hood, like with <a href="https://www.npmjs.com/package/mongoose" target="_blank">Mongoose</a>)
- <a href="https://redis.io/" target="_blank">Redis</a>
  <br>
  <br>
#### Other technologies that Pythagora works with:

| Apollo server | GraphQL | NestJS | Next.js | Nuxt.js | PostgreSQL | 
|       :---:     |     :---:      |     :---: |       :---:     |     :---:      |     :---: |
|<img src="https://user-images.githubusercontent.com/10895136/221188154-0d98b059-5cf1-48bd-b96b-400524d3cd55.png" width="50" alt="Logo 1" style="border-radius: 50%;" />|<img src="https://user-images.githubusercontent.com/10895136/221188225-ea8b0c45-fd37-4bf8-861b-8a97802702da.png" width="50" alt="Logo 2" style="border-radius: 50%" />|<img src="https://user-images.githubusercontent.com/10895136/221188433-e9634001-d9cb-40b2-b358-4932398955ef.png" width="50" alt="Logo 3" style="border-radius: 50%" />| <img src="https://user-images.githubusercontent.com/10895136/221188495-aaaa78bc-b31b-47cb-be37-47d55d4ccf0b.png" width="50" alt="Logo 1" style="border-radius: 50%;" />   | <img src="https://user-images.githubusercontent.com/10895136/221188561-24b75f90-01f7-4378-9664-88af12c9f666.png" width="50" alt="Logo 1" style="border-radius: 50%;" />     | <img src="https://user-images.githubusercontent.com/10895136/221188623-508a8238-8bd6-4858-a322-234582a70a87.png" width="50" alt="Logo 1" style="border-radius: 50%;" />   |
|   ✅   |    ✅    |   ✅    | Upcoming     | Upcoming       |   Upcoming    |

</details>

<br><br>
<h1 id="support">🤔️ FAQ</h1>

- **What happens when I make intential change that breaks tests. How can I update Pythagora tests?**
    - Pythagora tests can easily be updated by running the review command (`npx pythagora --review`). The review process is basically the same as a git review where you'll find each difference between the captured test and the failed one so you can choose if you need to debug this or you want to accept the new change. If you click `a`(as "accept"), the test will automatically update.

- **Automated tests should show me where the bug is - how can I find a bug with Pythagora tests?**
    - When a test fails, you can easily rerun the test that failed by adding `--test-id <TEST_ID>` to the test command. This way, if you add breakpoints across your code, you'll be able to easily debug the test itself with all the data the test is using. Also, we have plans for adding bug tracking features but at the moment we don't know when will it be ready.



<br>
<h1 id="alphaversion">🏁 Alpha version</h1>
This is an alpha version of Pythagora. To get an update about the beta release or to give a <b>suggestion on tech (framework / database) you want Pythagora to support</b> you can 👉 <a href="http://eepurl.com/ikg_nT" target="_blank">add your email / comment here</a> 👈 .
<br>
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

