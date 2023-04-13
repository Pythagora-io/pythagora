<p align=center>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/10895136/228003796-7e3319ad-f0b1-4da9-a2d0-6cf67ccc7a32.png">
    <img height="200px" alt="Text changing depending on mode. Light: 'So light!' Dark: 'So dark!'" src="https://user-images.githubusercontent.com/10895136/228003796-7e3319ad-f0b1-4da9-a2d0-6cf67ccc7a32.png">
  </picture>
</p>
<p align=center>
  Developers spend 20-30% of their time writing tests!
</p>
<h3 align="center">✊ Pythagora creates automated tests for you by analysing server activity ✊</h3>
<br>
<p align="center">🌟 As an open source tool, it would mean the world to us if you starred Pythagora repo 🌟<br>🙏 Thank you 🙏</p>
<br>
<div align="center">
  <a href="https://youtu.be/BVR7rCdBVdY"><img src="https://user-images.githubusercontent.com/10895136/217778681-bce3186f-c92d-4861-94cd-ad8bad29a2ff.gif" alt="Pythagora Alpha Demo"></a>
</div>

<h3 align="center">🎞️ ▶️  Video resources ▶️ 🎞️</h3>
<p align=center>
  <a target="_blank" href="https://youtu.be/YxzvljVyaEA">Pythagora Demo (4 min)</a>
  <br>
  <a target="_blank" href="https://youtu.be/ferEJsqBHqw">Pythagora Tech Deep Dive (16 min)</a>
  <br>
  <a target="_blank" href="https://youtu.be/opQP8NMCiPw">Dev Workflow With Pythagora (4 min)</a>
</p>

<h1 id="setup">⚙️ Installation</h1>

To integrate Pythagora into your Node.js app, you just need to install the pythagora package
   <br>
   ```bash
   npm install pythagora
   ```
   And that's it - no config or setup! You are ready to start recording your integration tests!
   <br>
   <br>
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
   NOTE: To stop the capture, you can exit the process like you usually do (Eg. `Ctrl + C`)   
   <br>
<h1 id="executingtests">▶️ Executing tests</h1>
When running tests, it doesn’t matter what database is your Node.js connected to or what is the state of that database. Actually, that database is never touched or used —> instead, Pythagora creates a special, ephemeral pythagoraDb database, which it uses to restore the data before each test is executed, which was present at the time when the test was recorded. Because of this, tests can be run on any machine or environment.

**If a test does an update to the database, Pythagora also checks the database to see if it was updated correctly.**

So, after you captured all requests you want, you just need to change the mode parameter to `--mode test` in the Pythagora command.
<br>
   ```bash
   npx pythagora --init-command "my start command" --mode test
   ```   

<br><br>
<h1 id="options">📖 Options</h1>

These are available options for Pythagora command:
<br><br><br>
<b>--rerun-all-failed</b> (runs again only tests that failed in previous run)
   ```bash
   npx pythagora --init-command "my start command" --mode test --rerun-all-failed
   ```
<br>

<b>--delete-all-failed</b> (deletes all previously failed tests)
   ```bash
   npx pythagora --init-command "my start command" --delete-all-failed
   ```
<br>

<b>--delete testId</b> (deletes test with testId)
   ```bash
   npx pythagora --init-command "my start command" --delete testId
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
<br>

<b>--review</b> (runs review process of failed tests, allowing you to update old captured tests or to delete them)
   ```bash
   npx pythagora --review
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
Each captured test is saved in <strong><i>pythagora_tests</i></strong> directory at the root of your repository.
Each JSON file in this repository represents one endpoint that was captured and each endpoint can have many captured tests.
If you open these files, you will see an array in which each object represents a single test. All data that's needed to run a test
is stored in this object. Here is an example of a test object.

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
<b>NOTE:</b> If you used Pythagora version < 0.0.39 tests were stored in files with delimiter "|" and since we added Windows support that is changed to "-_-".
To update all your tests to work with new version of Pythagora run:
```
npx pythagora --rename-tests
```

<br><br>
<h1 id="support">🤔️ FAQ</h1>

- **What happens when I make intential change that breaks tests. How can I update Pythagora tests?**
    - Pythagora tests can easily be updated by running the review command (`npx pythagora --review`). The review process is basically the same as a git review where you'll find each difference between the captured test and the failed one so you can choose if you need to debug this or you want to accept the new change. If you click `a`(as "accept"), the test will automatically update.

- **Automated tests should show me where the bug is - how can I find a bug with Pythagora tests?**
    - When a test fails, you can easily rerun the test that failed by adding `--test <TEST_ID>` to the test command. This way, if you add breakpoints across your code, you'll be able to easily debug the test itself with all the data the test is using. Also, we have plans for adding bug tracking features but at the moment we don't know when will it be ready.


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

